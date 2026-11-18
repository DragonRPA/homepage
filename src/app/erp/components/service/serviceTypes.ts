export interface AssignedServiceEmployee {
  employeeId: number;
  employeeNo: string;
  name: string;
  position: string;
  department: string;
  joinDate?: string; // 입사일 (YYYY-MM-DD) - 1일 이후 입사 시 월 용역료 일할계산 기준
  leaveDate?: string; // 퇴사일 (YYYY-MM-DD)
  baseSalary?: number; // 사원대장 월 기준 기본급 (퇴사자 급여 산식 표시용)
  contractRate: number; // 각 직원당 받는 월 기준 계약금액 (정상 만근 공급가액, 원)
  proRataEnabled?: boolean; // 입사일 기준 일할계산 적용 여부 (기본 true)
  note: string;
}
