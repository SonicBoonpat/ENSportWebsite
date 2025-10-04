import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';

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
      subject: `🏆 การแข่งขัน${matchDetails.sportType} กำลังจะเริ่มเร็วๆ นี้!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'IBM Plex Sans Thai Looped', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
              .match-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .match-info h2 { margin-top: 0; color: #667eea; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
              .vs { text-align: center; font-size: 24px; font-weight: bold; color: #667eea; margin: 15px 0; }
              .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏆 แจ้งเตือนการแข่งขัน</h1>
              </div>
              <div class="content">
                <div class="match-info">
                  <h2>${matchDetails.sportType}</h2>
                  
                  <div class="detail-row">
                    <span class="label">📅 วันที่:</span>
                    <span class="value">${matchDetails.date}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">⏰ เวลา:</span>
                    <span class="value">${matchDetails.timeStart} - ${matchDetails.timeEnd}</span>
                  </div>
                  
                  <div class="vs">
                    ${matchDetails.team1}
                    <br>VS<br>
                    ${matchDetails.team2}
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📍 สถานที่:</span>
                    <span class="value">${matchDetails.location}</span>
                  </div>
                  
                  <a href="${matchDetails.mapsLink}" class="btn" style="color: white;">🗺️ ดูแผนที่</a>
                </div>
                
                <p>อย่าพลาดการแข่งขันสุดมันส์! มาเชียร์ทีมของคุณกันเถอะ 🎉</p>
              </div>
              
              <div class="footer">
                <p>คุณได้รับอีเมลนี้เพราะคุณสมัครรับการแจ้งเตือนจากระบบของเรา</p>
                <p style="font-size: 12px; color: #999;">หากต้องการยกเลิกการรับข่าวสาร กรุณาติดต่อผู้ดูแลระบบ</p>
              </div>
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
      subject: '🎉 ยินดีต้อนรับสู่ระบบแจ้งเตือนกีฬา EN Sport Alerts!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'IBM Plex Sans Thai Looped', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 ยินดีต้อนรับ!</h1>
              </div>
              <div class="content">
                <p>สวัสดีครับ!</p>
                <p>ขอบคุณที่สมัครรับการแจ้งเตือนจาก <strong>EN Sport Alerts</strong></p>
                <p>ตั้งแต่นี้เป็นต้นไป คุณจะได้รับข่าวสารและการแจ้งเตือนเกี่ยวกับการแข่งขันกีฬาต่างๆ ทางอีเมลนี้</p>
                <p>เราจะแจ้งให้คุณทราบเมื่อมีการแข่งขันที่น่าสนใจเกิดขึ้น!</p>
                <p>ขอให้สนุกกับการเชียร์ 🏆</p>
              </div>
              <div class="footer">
                <p style="font-size: 12px; color: #999;">หากต้องการยกเลิกการรับข่าวสาร กรุณาติดต่อผู้ดูแลระบบ</p>
              </div>
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
      subject: `⏰ เตือนล่วงหน้า: การแข่งขัน${matchDetails.sportType} พรุ่งนี้!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'IBM Plex Sans Thai Looped', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
              .match-info { background: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b; }
              .match-info h2 { margin-top: 0; color: #ff6b6b; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
              .vs { text-align: center; font-size: 24px; font-weight: bold; color: #ff6b6b; margin: 15px 0; }
              .reminder-badge { background: #ff6b6b; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin-bottom: 15px; }
              .btn { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ เตือนล่วงหน้า 24 ชั่วโมง</h1>
              </div>
              <div class="content">
                <div class="reminder-badge">🚨 พรุ่งนี้มีการแข่งขัน!</div>
                
                <div class="match-info">
                  <h2>${matchDetails.sportType}</h2>
                  
                  <div class="detail-row">
                    <span class="label">📅 วันที่:</span>
                    <span class="value">${matchDetails.date}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">⏰ เวลา:</span>
                    <span class="value">${matchDetails.timeStart} - ${matchDetails.timeEnd}</span>
                  </div>
                  
                  <div class="vs">
                    ${matchDetails.team1}
                    <br>VS<br>
                    ${matchDetails.team2}
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📍 สถานที่:</span>
                    <span class="value">${matchDetails.location}</span>
                  </div>
                  
                  <a href="${matchDetails.mapsLink}" class="btn" style="color: white;">🗺️ ดูแผนที่</a>
                </div>
                
                <p><strong>อย่าลืม!</strong> การแข่งขันจะเริ่มในอีก 24 ชั่วโมง</p>
                <p>เตรียมตัวมาเชียร์ทีมของคุณกันเถอะ! 🎉</p>
              </div>
              
              <div class="footer">
                <p>คุณได้รับอีเมลนี้เพราะคุณสมัครรับการแจ้งเตือนจากระบบของเรา</p>
                <p style="font-size: 12px; color: #999;">หากต้องการยกเลิกการรับข่าวสาร กรุณาติดต่อผู้ดูแลระบบ</p>
              </div>
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
      subject: `🏆 ผลการแข่งขัน${matchDetails.sportType}: ${winnerText}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'IBM Plex Sans Thai Looped', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
              .match-info { background: #f8fff8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2ecc71; }
              .match-info h2 { margin-top: 0; color: #2ecc71; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
              .score-section { text-align: center; background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .score-display { font-size: 36px; font-weight: bold; color: #2ecc71; margin: 15px 0; }
              .teams { font-size: 18px; color: #333; margin: 10px 0; }
              .winner-badge { background: #2ecc71; color: white; padding: 10px 20px; border-radius: 25px; font-size: 16px; font-weight: bold; display: inline-block; margin: 15px 0; }
              .completed-badge { background: #27ae60; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin-bottom: 15px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏆 ผลการแข่งขัน</h1>
              </div>
              <div class="content">
                <div class="completed-badge">✅ การแข่งขันจบแล้ว</div>
                
                <div class="match-info">
                  <h2>${matchDetails.sportType}</h2>
                  
                  <div class="detail-row">
                    <span class="label">📅 วันที่:</span>
                    <span class="value">${matchDetails.date}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">⏰ เวลา:</span>
                    <span class="value">${matchDetails.timeStart} - ${matchDetails.timeEnd}</span>
                  </div>
                  
                  <div class="detail-row">
                    <span class="label">📍 สถานที่:</span>
                    <span class="value">${matchDetails.location}</span>
                  </div>
                </div>
                
                <div class="score-section">
                  <div class="teams">
                    ${matchDetails.team1} VS ${matchDetails.team2}
                  </div>
                  <div class="score-display">
                    ${matchDetails.homeScore} - ${matchDetails.awayScore}
                  </div>
                  <div class="winner-badge">
                    ${winnerEmoji} ${winnerText}
                  </div>
                </div>
                
                <p>การแข่งขันได้จบลงแล้ว! ขอบคุณที่ติดตามและเชียร์กัน 🎊</p>
              </div>
              
              <div class="footer">
                <p>คุณได้รับอีเมลนี้เพราะคุณสมัครรับการแจ้งเตือนจากระบบของเรา</p>
                <p style="font-size: 12px; color: #999;">หากต้องการยกเลิกการรับข่าวสาร กรุณาติดต่อผู้ดูแลระบบ</p>
              </div>
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

