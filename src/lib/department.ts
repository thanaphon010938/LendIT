export const DEPARTMENT_CODE = {
  IT: "IT",
  ACCOUNTING: "ACCOUNTING",
  GENERAL_ADMIN: "GENERAL_ADMIN",
  SUPPLIES: "SUPPLIES",
} as const;

export const DEFAULT_DEPARTMENTS = [
  { code: DEPARTMENT_CODE.IT, name: "แผนก IT" },
  { code: DEPARTMENT_CODE.ACCOUNTING, name: "แผนกบัญชี" },
  { code: DEPARTMENT_CODE.GENERAL_ADMIN, name: "แผนกบริหารทั่วไป" },
  { code: DEPARTMENT_CODE.SUPPLIES, name: "แผนกพัสดุ" },
];
