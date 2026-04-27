import { Op } from 'sequelize';
import { User, UserRole, UserStatus } from '../../models/User.model';
import { Travel } from '../../models/Travel.model';
import { Package, PackageStatus } from '../../models/Package.model';
import { Payment, PaymentStatus } from '../../models/Payment.model';
import { AppError } from '../../middlewares/errorHandler';

const SAFE_USER_ATTRS = {
  exclude: [
    'password',
    'email_verification_token',
    'email_verification_expires',
    'reset_password_token',
    'reset_password_expires',
  ],
};

export class AdminService {

  async getStats() {
    const [usersCount, travelsCount, packagesCount, revenueResult] = await Promise.all([
      User.count(),
      Travel.count(),
      Package.count(),
      Payment.sum('amount_usd', { where: { status: PaymentStatus.PAID } }),
    ]);

    const byRole = await User.findAll({
      attributes: ['role', [User.sequelize!.fn('COUNT', User.sequelize!.col('user_id')), 'count']],
      group: ['role'],
      raw: true,
    }) as unknown as Array<{ role: string; count: string }>;

    const byStatus = await Package.findAll({
      attributes: ['status', [Package.sequelize!.fn('COUNT', Package.sequelize!.col('package_id')), 'count']],
      group: ['status'],
      raw: true,
    }) as unknown as Array<{ status: string; count: string }>;

    return {
      users_count: usersCount,
      travels_count: travelsCount,
      packages_count: packagesCount,
      total_revenue_usd: revenueResult ?? 0,
      users_by_role: Object.fromEntries(byRole.map((r) => [r.role, Number(r.count)])),
      packages_by_status: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.count)])),
    };
  }

  async listUsers(opts: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    limit: number;
    offset: number;
  }) {
    const where: Record<string, unknown> = {};

    if (opts.search) {
      where[Op.or as unknown as string] = [
        { first_name: { [Op.like]: `%${opts.search}%` } },
        { last_name:  { [Op.like]: `%${opts.search}%` } },
        { email:      { [Op.like]: `%${opts.search}%` } },
      ];
    }
    if (opts.role)   where['role']   = opts.role;
    if (opts.status) where['status'] = opts.status;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: SAFE_USER_ATTRS,
      limit:  opts.limit,
      offset: opts.offset,
      order:  [['createdAt', 'DESC']],
    });

    return { total: count, users: rows };
  }

  async getUserById(userId: number) {
    const user = await User.findByPk(userId, { attributes: SAFE_USER_ATTRS });
    if (!user) throw new AppError(404, 'Utilisateur introuvable');
    return user;
  }

  async updateUser(userId: number, data: { status?: UserStatus; role?: UserRole }) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError(404, 'Utilisateur introuvable');

    if (data.status !== undefined) user.status = data.status;
    if (data.role   !== undefined) user.role   = data.role;

    await user.save();
    const { password: _p, ...safe } = user.toJSON() as unknown as Record<string, unknown>;
    return safe;
  }

  async listPackages(opts: {
    status?: PackageStatus;
    travel_id?: number;
    client_id?: number;
    search?: string;
    limit: number;
    offset: number;
  }) {
    const where: Record<string, unknown> = {};
    if (opts.status)    where['status']    = opts.status;
    if (opts.travel_id) where['travel_id'] = opts.travel_id;
    if (opts.client_id) where['client_id'] = opts.client_id;
    if (opts.search) {
      where[Op.or as unknown as string] = [
        { tracking_number: { [Op.like]: `%${opts.search}%` } },
        { description:     { [Op.like]: `%${opts.search}%` } },
      ];
    }

    const { count, rows } = await Package.findAndCountAll({
      where,
      include: [
        { association: 'client',    attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone'] },
        { association: 'travel',    attributes: ['travel_id', 'status', 'itinerary', 'transport_type', 'departure_date'] },
        { association: 'recipient', attributes: ['recipient_id', 'first_name', 'last_name', 'phone', 'city', 'country'] },
      ],
      limit:  opts.limit,
      offset: opts.offset,
      order:  [['createdAt', 'DESC']],
    });

    return { total: count, packages: rows };
  }
}

export const adminService = new AdminService();
