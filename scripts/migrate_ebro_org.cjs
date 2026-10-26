const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const { Client } = require('pg');

const sql = `
-- 1. erp_departments에 eBro ERP 조직 기능 태그(functional_tags) 및 updated_at 추가
ALTER TABLE erp_departments
  ADD COLUMN IF NOT EXISTS functional_tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. erp_employees에 department_id(미배정 NULL 허용), profile_image_url 추가 및 department NULL/빈문자열 허용
ALTER TABLE erp_employees
  ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES erp_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE erp_employees
  ALTER COLUMN department DROP NOT NULL,
  ALTER COLUMN department SET DEFAULT '';

-- 3. 기존 부서에 기본 보편 기능 속성(functional_tags) 및 계층 구조 초기 매핑 (비어있는 경우에만)
UPDATE erp_departments
SET functional_tags = '["ATTR_ADMIN", "ATTR_BILLING"]'::jsonb
WHERE dept_code = 'EXEC' AND (functional_tags IS NULL OR functional_tags = '[]'::jsonb);

UPDATE erp_departments
SET functional_tags = '["ATTR_PRODUCTION", "ATTR_ASSET"]'::jsonb
WHERE dept_code = 'TECH' AND (functional_tags IS NULL OR functional_tags = '[]'::jsonb);

UPDATE erp_departments
SET functional_tags = '["ATTR_SALES", "ATTR_DISPATCH", "ATTR_OUTBOUND"]'::jsonb
WHERE dept_code = 'SALES' AND (functional_tags IS NULL OR functional_tags = '[]'::jsonb);

UPDATE erp_departments
SET functional_tags = '["ATTR_AFTER_SERVICE", "ATTR_INBOUND"]'::jsonb
WHERE dept_code = 'SUPPORT' AND (functional_tags IS NULL OR functional_tags = '[]'::jsonb);

-- 경영총괄(id=1) 하위로 초기 부서 트리 연결 (아직 parent_id가 모두 null인 경우)
UPDATE erp_departments
SET parent_id = (SELECT id FROM erp_departments WHERE dept_code = 'EXEC' LIMIT 1)
WHERE dept_code IN ('TECH', 'SALES', 'SUPPORT')
  AND parent_id IS NULL
  AND EXISTS (SELECT 1 FROM erp_departments WHERE dept_code = 'EXEC');

-- 4. 기존 임직원의 department(부서명)와 erp_departments.dept_name 매칭하여 department_id 동기화
UPDATE erp_employees e
SET department_id = d.id
FROM erp_departments d
WHERE e.department = d.dept_name
  AND e.department_id IS NULL;
`;

async function main() {
  const connStr = process.env.SUPABASE_DB_URL.replace('?sslmode=require', '').replace('&sslmode=require', '');
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Successfully migrated erp_departments and erp_employees for eBro ERP organization logic!');
    const depts = await client.query('SELECT id, dept_code, dept_name, parent_id, functional_tags FROM erp_departments ORDER BY sort_order, id');
    console.log('Departments:', depts.rows);
    const emps = await client.query('SELECT id, employee_no, login_id, name, department_id, department, position, duty, tier_level, role, employment_status FROM erp_employees ORDER BY id');
    console.log('Employees:', emps.rows);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
