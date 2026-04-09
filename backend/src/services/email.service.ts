import { Resend } from 'resend';
import { env } from '../configs/env.config';

const resend = new Resend(env.resend.apiKey);

export async function sendVerificationEmail(
  to: string,
  firstName: string,
  token: string,
): Promise<void> {
  const url = `${env.app.frontendUrl}/verify-email?token=${token}`;

  await resend.emails.send({
    from: env.resend.fromEmail,
    to,
    subject: 'Vérifiez votre adresse email — KDCL Groupage',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto">
    <tr>
      <td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px 36px;text-align:center">
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px">KDCL Groupage</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 32px">Gestion de fret intelligente</p>

        <h2 style="color:#fff;font-size:18px;font-weight:700;margin:0 0 12px">Bonjour ${firstName},</h2>
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 32px">
          Cliquez sur le bouton ci-dessous pour vérifier votre adresse email. Ce lien est valide pendant <strong style="color:#fff">24 heures</strong>.
        </p>

        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:100px">
          Vérifier mon email
        </a>

        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:32px 0 0">
          Si vous n'avez pas demandé cette vérification, ignorez cet email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  token: string,
): Promise<void> {
  const url = `${env.app.frontendUrl}/reset-password?token=${token}`;

  await resend.emails.send({
    from: env.resend.fromEmail,
    to,
    subject: 'Réinitialisation de votre mot de passe — KDCL Groupage',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto">
    <tr>
      <td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px 36px;text-align:center">
        <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px">KDCL Groupage</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 32px">Gestion de fret intelligente</p>

        <h2 style="color:#fff;font-size:18px;font-weight:700;margin:0 0 12px">Bonjour ${firstName},</h2>
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 32px">
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valide pendant <strong style="color:#fff">1 heure</strong>.
        </p>

        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:100px">
          Réinitialiser mon mot de passe
        </a>

        <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:28px 0 0;line-height:1.5">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <span style="color:rgba(255,255,255,0.3);font-size:11px;word-break:break-all">${url}</span>
        </p>

        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:24px 0 0">
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne sera pas modifié.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
