import { Router } from 'express';
import authRoutes from './auth.routes';
import employeeRoutes from './employee.routes';
import userRoutes from './user.routes';
import workingScheduleRoutes from './working-schedule.routes';
import timeOffTypeRoutes from './time-off-type.routes';
import salaryStructureRoutes from './salary-structure.routes';
import salaryRuleRoutes from './salary-rule.routes';
import contractRoutes from './contract.routes';
import attendanceRoutes from './attendance.routes';
import timeOffAllocationRoutes from './time-off-allocation.routes';
import timeOffRequestRoutes from './time-off-request.routes';
import payRunRoutes from './pay-run.routes';
import payslipRoutes from './payslip.routes';
import dashboardRoutes from './dashboard.routes';
import holidayRoutes from './holiday.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/users', userRoutes);
router.use('/working-schedules', workingScheduleRoutes);
router.use('/time-off-types', timeOffTypeRoutes);
router.use('/salary-structures', salaryStructureRoutes);
router.use('/salary-rules', salaryRuleRoutes);
router.use('/contracts', contractRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/time-off-allocations', timeOffAllocationRoutes);
router.use('/time-off-requests', timeOffRequestRoutes);
router.use('/pay-runs', payRunRoutes);
router.use('/payslips', payslipRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/holidays', holidayRoutes);

export default router;
