import { Response, NextFunction } from 'express';
import { PayoutAccount, PayoutAccountType, MobileOperator } from '../../models/PayoutAccount.model';
import { AppError } from '../../middlewares/errorHandler';
import type { AuthRequest } from '../../middlewares/authenticate';
import { sequelize } from '../../configs/database.config';

export async function getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const accounts = await PayoutAccount.findAll({ where: { user_id: userId }, order: [['is_default', 'DESC'], ['createdAt', 'ASC']] });
    res.json(accounts);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.user_id;
    const { type, account_holder_name, iban, mobile_number, mobile_operator, country_code, is_default } = req.body;

    if (!type || !Object.values(PayoutAccountType).includes(type)) {
      throw new AppError(400, 'type must be iban or mobile_money');
    }
    if (!account_holder_name) throw new AppError(400, 'account_holder_name is required');
    if (!country_code)        throw new AppError(400, 'country_code is required');

    if (type === PayoutAccountType.IBAN && !iban) {
      throw new AppError(400, 'iban is required for IBAN accounts');
    }
    if (type === PayoutAccountType.MOBILE_MONEY) {
      if (!mobile_number)   throw new AppError(400, 'mobile_number is required for mobile_money accounts');
      if (!mobile_operator || !Object.values(MobileOperator).includes(mobile_operator)) {
        throw new AppError(400, 'mobile_operator must be mtn or orange');
      }
    }

    const t = await sequelize.transaction();
    try {
      if (is_default) {
        await PayoutAccount.update({ is_default: false }, { where: { user_id: userId }, transaction: t });
      }
      const account = await PayoutAccount.create({
        user_id: userId,
        type,
        account_holder_name,
        iban:             iban ?? null,
        mobile_number:    mobile_number ?? null,
        mobile_operator:  mobile_operator ?? null,
        country_code,
        is_default:       is_default ?? false,
        is_verified:      false,
      }, { transaction: t });
      await t.commit();
      res.status(201).json(account);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId    = req.user!.user_id;
    const accountId = Number(req.params['id']);
    const account   = await PayoutAccount.findOne({ where: { account_id: accountId, user_id: userId } });
    if (!account) throw new AppError(404, 'Payout account not found');

    const { account_holder_name, iban, mobile_number, mobile_operator, country_code } = req.body;
    await account.update({ account_holder_name, iban, mobile_number, mobile_operator, country_code });
    res.json(account);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId    = req.user!.user_id;
    const accountId = Number(req.params['id']);
    const account   = await PayoutAccount.findOne({ where: { account_id: accountId, user_id: userId } });
    if (!account) throw new AppError(404, 'Payout account not found');
    await account.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function setDefault(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId    = req.user!.user_id;
    const accountId = Number(req.params['id']);
    const account   = await PayoutAccount.findOne({ where: { account_id: accountId, user_id: userId } });
    if (!account) throw new AppError(404, 'Payout account not found');

    const t = await sequelize.transaction();
    try {
      await PayoutAccount.update({ is_default: false }, { where: { user_id: userId }, transaction: t });
      await account.update({ is_default: true }, { transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
    res.json(account);
  } catch (err) {
    next(err);
  }
}
