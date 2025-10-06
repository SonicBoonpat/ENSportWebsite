import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';

// ---- EN SPORT email theme tokens (single source of truth) ----
const THEME = {
  bg: '#000000',
  cardBg: '#0a0a0a',
  border: 'rgba(255,255,255,.10)',
  headerFrom: '#ef4444',
  headerTo: '#7f1d1d',
  headerAltFrom: '#b91c1c',
  text: '#e5e7eb',
  subtext: '#9ca3af',
  label: '#cbd5e1',
  accent: '#ef4444',
  accentStrong: '#dc2626',
  brandFont: "'Orbitron', Arial Black, Impact, sans-serif",
  bodyFont:
    "'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
} as const;

/**
 * ส่งอีเมลแจ้งเตือนการแข่งขันกีฬา
 */
export async function sendMatchNotification(
  to: string | string[],
  matchDetails: {
    sportType: string;
    team1: string;
    team2: string;
    date: string;
    timeStart: string;
    timeEnd: string;
    location: string;
    mapsLink: string;
  }
) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `การแข่งขัน${matchDetails.sportType} กำลังจะเริ่มเร็วๆ นี้!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@100;200;300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
              :root { color-scheme: dark; }
              body { margin:0; padding:0; background:${THEME.bg}; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
              .container { max-width:640px; margin:0 auto; padding:24px 16px; }
              .card { border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid ${THEME.border}; background:${THEME.cardBg}; }
              .header { background:linear-gradient(135deg, ${THEME.headerFrom} 0%, ${THEME.headerTo} 100%); padding:28px 24px; text-align:center; }
              .brand { margin:0; font-family:${THEME.brandFont}; font-size:22px; letter-spacing:.08em; color:#fff; }
              .section { padding:24px; font-family:${THEME.bodyFont}; color:${THEME.text}; font-size:17px; line-height:1.7; }
              .heading { font-weight:700; margin:0 0 10px; color:#fca5a5; font-size:18px; }
              .row { margin:8px 0; }
              .label { color:${THEME.label}; font-weight:600; display:inline-block; min-width:92px; }
              .value { color:${THEME.text}; }
              .vs { text-align:center; font-size:20px; font-weight:700; color:#f87171; margin:16px 0; letter-spacing:.04em; }
              .box { background:rgba(255,255,255,.04); padding:18px; border-radius:12px; border-left:4px solid ${THEME.accent}; }
              .btn-wrap { text-align:center; margin-top:18px; }
              .btn { display:inline-block; background:${THEME.accentStrong}; color:#fff !important; padding:14px 24px; text-decoration:none; border-radius:12px; font-weight:700; letter-spacing:.02em; }
              .footer { text-align:center; color:${THEME.subtext}; font-size:12px; margin-top:16px; font-family:${THEME.bodyFont}; }
              .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;}
              a { color:#fff; text-decoration:none; }
            </style>
          </head>
          <body>
            <span class="preheader">การแข่งขัน ${matchDetails.sportType} กำลังจะเริ่ม – ดูเวลาและสถานที่</span>
            <div class="container">
              <div class="card">
                <div class="header">
                  <h1 class="brand">EN SPORT • แจ้งเตือนการแข่งขัน</h1>
                </div>
                <div class="section">
                  <div class="box">
                    <h2 class="heading">${matchDetails.sportType}</h2>
                    <div class="row"><span class="label">วันที่:</span> <span class="value">${matchDetails.date}</span></div>
                    <div class="row"><span class="label">เวลา:</span> <span class="value">${matchDetails.timeStart} - ${matchDetails.timeEnd}</span></div>
                    <div class="vs">${matchDetails.team1}<br/>VS<br/>${matchDetails.team2}</div>
                    <div class="row"><span class="label">สถานที่:</span> <span class="value">${matchDetails.location}</span></div>
                    <div class="btn-wrap">
                      <a href="${matchDetails.mapsLink}" class="btn">🗺️ เปิดแผนที่</a>
                    </div>
                  </div>
                  <p style="margin:16px 0 0; color:${THEME.text}; opacity:.85;">อย่าพลาดการแข่งขันสุดมันส์! มาเชียร์ทีมของคุณกันเถอะ 🎉</p>
                </div>
              </div>
              <div class="footer">คุณได้รับอีเมลนี้เพราะสมัครรับการแจ้งเตือนจาก EN SPORT • ต้องการยกเลิก โปรดติดต่อผู้ดูแลระบบ</div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendMatchNotification:', error);
    return { success: false, error };
  }
}

/**
 * ส่งอีเมลยืนยันการสมัครรับข่าวสาร
 */
export async function sendWelcomeEmail(to: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'ยินดีต้อนรับสู่ระบบแจ้งเตือนกีฬา EN Sport Alerts!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@100;200;300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
              :root { color-scheme: dark; }
              body { margin:0; padding:0; background:${THEME.bg}; }
              .container { max-width:640px; margin:0 auto; padding:24px 16px; }
              .card { border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid ${THEME.border}; background:${THEME.cardBg}; }
              .header { background:linear-gradient(135deg, ${THEME.headerFrom} 0%, ${THEME.headerTo} 100%); padding:28px 24px; text-align:center; }
              .brand { margin:0; font-family:${THEME.brandFont}; font-size:22px; letter-spacing:.08em; color:#fff; }
              .section { padding:24px; font-family:${THEME.bodyFont}; color:${THEME.text}; font-size:17px; line-height:1.7; }
              .footer { text-align:center; color:${THEME.subtext}; font-size:12px; margin-top:16px; font-family:${THEME.bodyFont}; }
              .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;}
            </style>
          </head>
          <body>
            <span class="preheader">ยินดีต้อนรับสู่ EN SPORT Alerts</span>
            <div class="container">
              <div class="card">
                <div class="header">
                  <h1 class="brand">EN SPORT • ยินดีต้อนรับ</h1>
                </div>
                <div class="section">
                  <p style="margin:0 0 10px;">สวัสดีครับ!</p>
                  <p style="margin:0 0 10px;">ขอบคุณที่สมัครรับการแจ้งเตือนจาก <strong>EN SPORT Alerts</strong></p>
                  <p style="margin:0 0 10px;">ตั้งแต่นี้เป็นต้นไป คุณจะได้รับข่าวสารและการแจ้งเตือนเกี่ยวกับการแข่งขันกีฬาทางอีเมลนี้</p>
                  <p style="margin:0;">ขอให้สนุกกับการเชียร์ </p>
                </div>
              </div>
              <div class="footer">ต้องการยกเลิกรับข่าวสาร? โปรดติดต่อผู้ดูแลระบบ</div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendWelcomeEmail:', error);
    return { success: false, error };
  }
}

/**
 * ส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชั่วโมงก่อนการแข่งขัน
 */
export async function send24HourReminder(
  to: string | string[],
  matchDetails: {
    sportType: string;
    team1: string;
    team2: string;
    date: string;
    timeStart: string;
    timeEnd: string;
    location: string;
    mapsLink: string;
  }
) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `เตือนล่วงหน้า: การแข่งขัน${matchDetails.sportType} พรุ่งนี้!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
            <style>
              :root { color-scheme: dark; }
              body { margin:0; padding:0; background:${THEME.bg}; }
              .container { max-width:640px; margin:0 auto; padding:24px 16px; }
              .card { border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid ${THEME.border}; background:${THEME.cardBg}; }
              .header { background:linear-gradient(135deg, ${THEME.headerAltFrom} 0%, ${THEME.headerTo} 100%); padding:28px 24px; text-align:center; }
              .brand { margin:0; font-family:${THEME.brandFont}; font-size:22px; letter-spacing:.08em; color:#fff; }
              .section { padding:24px; font-family:${THEME.bodyFont}; color:${THEME.text}; font-size:17px; line-height:1.7; }
              .badge { background:${THEME.headerAltFrom}; color:#fff; padding:8px 16px; border-radius:999px; font-size:13px; font-weight:700; display:inline-block; margin:0 0 12px; }
              .box { background:rgba(255,255,255,.04); padding:18px; border-radius:12px; border-left:4px solid ${THEME.accent}; }
              .heading { font-weight:700; margin:0 0 10px; color:#fca5a5; font-size:18px; }
              .row { margin:8px 0; }
              .label { color:${THEME.label}; font-weight:600; display:inline-block; min-width:92px; }
              .value { color:${THEME.text}; }
              .vs { text-align:center; font-size:20px; font-weight:700; color:#f87171; margin:16px 0; letter-spacing:.04em; }
              .btn-wrap { text-align:center; margin-top:18px; }
              .btn { display:inline-block; background:${THEME.accentStrong}; color:#fff !important; padding:14px 24px; text-decoration:none; border-radius:12px; font-weight:700; letter-spacing:.02em; }
              .footer { text-align:center; color:${THEME.subtext}; font-size:12px; margin-top:16px; font-family:${THEME.bodyFont}; }
              .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;}
            </style>
          </head>
          <body>
            <span class="preheader">พรุ่งนี้มีการแข่งขัน — ดูเวลา สถานที่ และทีมที่ลงแข่ง</span>
            <div class="container">
              <div class="card">
                <div class="header">
                  <h1 class="brand">EN SPORT</h1>
                </div>
                <div class="section">
                  <div class="badge">พรุ่งนี้มีการแข่งขัน!</div>
                  <div class="box">
                    <h2 class="heading">${matchDetails.sportType}</h2>
                    <div class="row"><span class="label">วันที่:</span> <span class="value">${matchDetails.date}</span></div>
                    <div class="row"><span class="label">เวลา:</span> <span class="value">${matchDetails.timeStart} - ${matchDetails.timeEnd}</span></div>
                    <div class="vs">${matchDetails.team1}<br/>VS<br/>${matchDetails.team2}</div>
                    <div class="row"><span class="label">สถานที่:</span> <span class="value">${matchDetails.location}</span></div>
                    <div class="btn-wrap"><a href="${matchDetails.mapsLink}" class="btn">เปิดแผนที่</a></div>
                  </div>
                  <p style="margin:16px 0 0; color:${THEME.text}; opacity:.85;">การแข่งขันจะเริ่มในอีก 24 ชั่วโมง เตรียมตัวมาเชียร์ทีมของคุณกันเถอะ 🎉</p>
                </div>
              </div>
              <div class="footer">คุณได้รับอีเมลนี้เพราะสมัครรับการแจ้งเตือนจาก EN SPORT</div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending 24-hour reminder:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in send24HourReminder:', error);
    return { success: false, error };
  }
}

/**
 * ส่งอีเมลแจ้งผลการแข่งขันเมื่อสถานะเป็น COMPLETED
 */
export async function sendMatchResult(
  to: string | string[],
  matchDetails: {
    sportType: string;
    team1: string;
    team2: string;
    date: string;
    timeStart: string;
    timeEnd: string;
    location: string;
    homeScore: number;
    awayScore: number;
    winner: string;
  }
) {
  try {
    // กำหนดผู้ชนะ
    let winnerText = '';
    let winnerEmoji = '';
    if (matchDetails.winner === 'team1') {
      winnerText = `🏆 ${matchDetails.team1} ชนะ!`;
      winnerEmoji = '🎉';
    } else if (matchDetails.winner === 'team2') {
      winnerText = `🏆 ${matchDetails.team2} ชนะ!`;
      winnerEmoji = '🎉';
    } else {
      winnerText = '🤝 เสมอ!';
      winnerEmoji = '🤝';
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: `ผลการแข่งขัน${matchDetails.sportType}: ${winnerText}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
            <style>
              :root { color-scheme: dark; }
              body { margin:0; padding:0; background:${THEME.bg}; }
              .container { max-width:640px; margin:0 auto; padding:24px 16px; }
              .card { border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid ${THEME.border}; background:${THEME.cardBg}; }
              .header { background:linear-gradient(135deg, ${THEME.headerFrom} 0%, ${THEME.headerTo} 100%); padding:28px 24px; text-align:center; }
              .brand { margin:0; font-family:${THEME.brandFont}; font-size:22px; letter-spacing:.08em; color:#fff; }
              .section { padding:24px; font-family:${THEME.bodyFont}; color:${THEME.text}; font-size:17px; line-height:1.7; }
              .meta { background:rgba(255,255,255,.04); padding:18px; border-radius:12px; border-left:4px solid ${THEME.accent}; }
              .heading { font-weight:700; margin:0 0 10px; color:#fca5a5; font-size:18px; }
              .row { margin:8px 0; }
              .label { color:${THEME.label}; font-weight:600; display:inline-block; min-width:92px; }
              .value { color:${THEME.text}; }
              .score { text-align:center; background:rgba(255,255,255,.04); padding:18px; border-radius:12px; border:1px solid rgba(255,255,255,.08); margin:18px 0; }
              .teams { font-size:16px; color:${THEME.text}; }
              .score-num { font-size:36px; font-weight:800; color:#fff; margin:10px 0; letter-spacing:.03em; }
              .winner { background:${THEME.accent}; color:#fff; padding:10px 20px; border-radius:999px; font-size:14px; font-weight:800; display:inline-block; }
              .badge { background:${THEME.headerTo}; color:#fff; padding:8px 16px; border-radius:999px; font-size:12px; font-weight:700; display:inline-block; margin-bottom:12px; }
              .footer { text-align:center; color:${THEME.subtext}; font-size:12px; margin-top:16px; font-family:${THEME.bodyFont}; }
              .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;}
            </style>
          </head>
          <body>
            <span class="preheader">ผลการแข่งขัน ${matchDetails.sportType} — ${matchDetails.team1} ${matchDetails.homeScore} : ${matchDetails.awayScore} ${matchDetails.team2}</span>
            <div class="container">
              <div class="card">
                <div class="header"><h1 class="brand">EN SPORT • ผลการแข่งขัน</h1></div>
                <div class="section">
                  <div class="badge">การแข่งขันจบแล้ว</div>
                  <div class="meta">
                    <h2 class="heading">${matchDetails.sportType}</h2>
                    <div class="row"><span class="label">วันที่:</span> <span class="value">${matchDetails.date}</span></div>
                    <div class="row"><span class="label">เวลา:</span> <span class="value">${matchDetails.timeStart} - ${matchDetails.timeEnd}</span></div>
                    <div class="row"><span class="label">สถานที่:</span> <span class="value">${matchDetails.location}</span></div>
                  </div>
                  <div class="score">
                    <div class="teams">${matchDetails.team1} VS ${matchDetails.team2}</div>
                    <div class="score-num">${matchDetails.homeScore} - ${matchDetails.awayScore}</div>
                    <div class="winner">${winnerEmoji} ${winnerText}</div>
                  </div>
                  <p style="margin:0; color:${THEME.text}; opacity:.85;">ขอบคุณที่ติดตามและเชียร์กัน 🎊</p>
                </div>
              </div>
              <div class="footer">คุณได้รับอีเมลนี้เพราะสมัครรับการแจ้งเตือนจาก EN SPORT</div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending match result:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendMatchResult:', error);
    return { success: false, error };
  }
}
