import { dbQuery } from '../config/db';

interface WeightInput {
  criteriaId: string;
  weight: number;
}

export interface SAWStepByStep {
  criteria: any[];
  lecturers: any[];
  initialMatrix: any[];
  minMaxValues: { [key: string]: number };
  normalizedMatrix: any[];
  weightedMatrix: any[];
  ranking: any[];
}

export async function calculateSAW(
  tenantId: string,
  weights: WeightInput[],
  departmentFilter?: string
): Promise<SAWStepByStep> {
  // 1. Get all active criteria for this tenant
  const criteriaList = await dbQuery.all(
    'SELECT * FROM criteria WHERE tenant_id = ? ORDER BY code ASC',
    [tenantId]
  );

  if (criteriaList.length === 0) {
    throw new Error('Kriteria untuk Jurusan/Fakultas ini belum dikonfigurasi.');
  }

  // Map criteria by ID for quick access
  const criteriaMap: { [key: string]: any } = {};
  criteriaList.forEach((c) => {
    criteriaMap[c.id] = c;
  });

  // Convert weights input to a map of criteria_id -> normalized decimal weight (e.g. 25% -> 0.25)
  // Ensure we fall back to default weight if not provided
  const weightsMap: { [key: string]: number } = {};
  
  // Calculate total input weight to normalize it to 1.0 if they don't sum to 100
  let totalInputWeight = weights.reduce((sum, w) => sum + Number(w.weight), 0);
  if (totalInputWeight === 0) {
    // If no weights provided or total is 0, use defaults
    const defaultSum = criteriaList.reduce((sum, c) => sum + c.default_weight, 0);
    criteriaList.forEach((c) => {
      weightsMap[c.id] = c.default_weight / defaultSum;
    });
  } else {
    weights.forEach((w) => {
      weightsMap[w.criteriaId] = Number(w.weight) / totalInputWeight;
    });
    // Fill in any missing criteria with 0 or default
    criteriaList.forEach((c) => {
      if (weightsMap[c.id] === undefined) {
        weightsMap[c.id] = 0;
      }
    });
  }

  // 2. Get lecturers
  let lecturerQuery = 'SELECT * FROM lecturers WHERE tenant_id = ? AND is_active = 1';
  const params: any[] = [tenantId];
  if (departmentFilter && departmentFilter !== 'Semua') {
    lecturerQuery += ' AND department = ?';
    params.push(departmentFilter);
  }

  const lecturers = await dbQuery.all(lecturerQuery, params);

  if (lecturers.length === 0) {
    return {
      criteria: criteriaList,
      lecturers: [],
      initialMatrix: [],
      minMaxValues: {},
      normalizedMatrix: [],
      weightedMatrix: [],
      ranking: []
    };
  }

  // 3. Get all criteria values for these lecturers
  const lecturerIds = lecturers.map((l) => l.id);
  const placeholders = lecturerIds.map(() => '?').join(',');
  const rawValues = await dbQuery.all(
    `SELECT * FROM lecturer_criteria_values 
     WHERE tenant_id = ? AND lecturer_id IN (${placeholders})`,
    [tenantId, ...lecturerIds]
  );

  // Organize values into nested map: lecturerId -> criteriaId -> value
  const valueMap: { [lecId: string]: { [critId: string]: number } } = {};
  
  lecturers.forEach((l) => {
    valueMap[l.id] = {};
    // Pre-populate with default 0 in case values are missing
    criteriaList.forEach((c) => {
      valueMap[l.id][c.id] = 0;
    });
  });

  rawValues.forEach((val) => {
    if (valueMap[val.lecturer_id]) {
      valueMap[val.lecturer_id][val.criteria_id] = Number(val.value);
    }
  });

  // 4. Construct Initial Decision Matrix
  const initialMatrix = lecturers.map((l) => {
    const vals: { [code: string]: number } = {};
    criteriaList.forEach((c) => {
      vals[c.code] = valueMap[l.id][c.id] || 0;
    });
    return {
      lecturerId: l.id,
      name: l.name,
      department: l.department,
      avatarUrl: l.avatar_url,
      values: vals
    };
  });

  // 5. Find Min / Max values for normalization
  // For Benefit: Max value in column
  // For Cost: Min value in column
  const minMaxValues: { [code: string]: number } = {};
  criteriaList.forEach((c) => {
    const colValues = lecturers.map((l) => valueMap[l.id][c.id] || 0);
    if (c.type === 'benefit') {
      minMaxValues[c.code] = colValues.length > 0 ? Math.max(...colValues) : 1;
      // Prevent division by zero
      if (minMaxValues[c.code] === 0) minMaxValues[c.code] = 1;
    } else {
      // For Cost: filter out 0 if we assume scores can't be 0, or standard min.
      // If min is 0, we can use 1 to prevent invalid normalization
      const nonZeroColValues = colValues.filter((v) => v > 0);
      minMaxValues[c.code] = nonZeroColValues.length > 0 ? Math.min(...nonZeroColValues) : (Math.min(...colValues) || 1);
    }
  });

  // 6. Calculate Normalized Matrix (R)
  // Benefit: r_ij = x_ij / max(x_j)
  // Cost: r_ij = min(x_j) / x_ij
  const normalizedMatrix = initialMatrix.map((row) => {
    const normVals: { [code: string]: number } = {};
    criteriaList.forEach((c) => {
      const val = valueMap[row.lecturerId][c.id] || 0;
      const extremum = minMaxValues[c.code];
      if (c.type === 'benefit') {
        normVals[c.code] = val / extremum;
      } else {
        // Cost
        normVals[c.code] = val === 0 ? 0 : extremum / val;
      }
    });
    return {
      lecturerId: row.lecturerId,
      name: row.name,
      department: row.department,
      values: normVals
    };
  });

  // 7. Calculate Weighted Matrix and Final Score (V)
  // V_i = sum(w_j * r_ij)
  const rankingRaw = normalizedMatrix.map((row) => {
    const weightedVals: { [code: string]: number } = {};
    let finalScore = 0;

    criteriaList.forEach((c) => {
      const normVal = row.values[c.code];
      const weight = weightsMap[c.id] || 0;
      const weightedVal = normVal * weight;
      weightedVals[c.code] = weightedVal;
      finalScore += weightedVal;
    });

    return {
      lecturerId: row.lecturerId,
      name: row.name,
      department: row.department,
      weightedValues: weightedVals,
      finalScore: Number(finalScore.toFixed(4))
    };
  });

  // Sort by final score descending to get ranking
  const ranking = [...rankingRaw]
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((item, index) => ({
      rank: index + 1,
      ...item
    }));

  // Build a nice weighted matrix helper for step-by-step
  const weightedMatrix = normalizedMatrix.map((row) => {
    const weightedVals: { [code: string]: number } = {};
    criteriaList.forEach((c) => {
      const normVal = row.values[c.code];
      const weight = weightsMap[c.id] || 0;
      weightedVals[c.code] = normVal * weight;
    });
    return {
      lecturerId: row.lecturerId,
      name: row.name,
      values: weightedVals
    };
  });

  return {
    criteria: criteriaList.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      type: c.type,
      weightUsed: Number((weightsMap[c.id] * 100).toFixed(2)) // Display as percentage (0-100)
    })),
    lecturers: lecturers.map((l) => ({ id: l.id, name: l.name, department: l.department })),
    initialMatrix,
    minMaxValues,
    normalizedMatrix,
    weightedMatrix,
    ranking
  };
}
