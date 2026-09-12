import { SampleSign, UserContextOption, SignCategory } from '../types';

interface SampleSignDef {
  id: string;
  title: string;
  category: SignCategory;
  recommendedContext: UserContextOption;
  description: string;
}

export const SAMPLE_SIGN_DEFS: SampleSignDef[] = [
  {
    id: 'no-parking',
    title: 'No Parking / Tow-Away Zone',
    category: 'parking',
    recommendedContext: 'Driver',
    description: 'City municipal traffic restriction with penalty notice',
  },
  {
    id: 'high-voltage',
    title: 'Caution: High Voltage Danger',
    category: 'safety',
    recommendedContext: 'Patient / Visitor',
    description: 'Industrial high-voltage electrical substation warning',
  },
  {
    id: 'hospital-quiet',
    title: 'Hospital Silence & ICU Notice',
    category: 'health',
    recommendedContext: 'Patient / Visitor',
    description: 'Healthcare facility quiet zone and visiting hours rule',
  },
  {
    id: 'metro-transit',
    title: 'Metro Transit Platform Safety',
    category: 'transport',
    recommendedContext: 'Traveler',
    description: 'Rapid transit platform safety instruction',
  },
  {
    id: 'campus-exam',
    title: 'University Examination Quiet Notice',
    category: 'education',
    recommendedContext: 'Student',
    description: 'Academic exam hall quiet directive with device regulations',
  },
];

// Helper to round rectangle on canvas
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const signDataUrlCache = new Map<string, string>();

export function getSampleSignDataUrl(id: string): string {
  if (typeof document === 'undefined') {
    return '';
  }

  if (signDataUrlCache.has(id)) {
    return signDataUrlCache.get(id)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (id === 'no-parking') {
    // 1. No parking sign
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 600, 700);

    // Plate
    roundRect(ctx, 20, 20, 560, 660, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Red inner border
    roundRect(ctx, 36, 36, 528, 628, 20);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    // Tow-away header
    roundRect(ctx, 50, 55, 500, 90, 12);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOW-AWAY ZONE', 300, 115);

    // Circle with slash and P
    ctx.beginPath();
    ctx.arc(300, 270, 95, 0, Math.PI * 2);
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = '900 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 300, 270);

    // Diagonal slash
    ctx.beginPath();
    ctx.moveTo(233, 203);
    ctx.lineTo(367, 337);
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#dc2626';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Reset baseline
    ctx.textBaseline = 'alphabetic';

    // Text notices
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px sans-serif';
    ctx.fillText('NO PARKING ANYTIME', 300, 425);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, 455);
    ctx.lineTo(530, 455);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '700 24px sans-serif';
    ctx.fillText('VEHICLES WILL BE IMPOUNDED', 300, 500);

    ctx.fillStyle = '#dc2626';
    ctx.font = '900 30px sans-serif';
    ctx.fillText('MINIMUM FINE: ₹1,500 / $75', 300, 548);

    roundRect(ctx, 80, 580, 440, 54, 10);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '700 18px sans-serif';
    ctx.fillText('MUNICIPAL TRAFFIC POLICE ORDER', 300, 614);
  } else if (id === 'high-voltage') {
    // 2. High voltage danger
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(0, 0, 600, 700);

    roundRect(ctx, 20, 20, 560, 660, 24);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    roundRect(ctx, 36, 36, 528, 628, 16);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // DANGER oval
    roundRect(ctx, 55, 55, 490, 95, 12);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(300, 102, 210, 36, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.font = '900 46px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DANGER', 300, 118);

    // Lightning bolt polygon
    ctx.beginPath();
    ctx.moveTo(300, 175);
    ctx.lineTo(260, 275);
    ctx.lineTo(295, 275);
    ctx.lineTo(270, 370);
    ctx.lineTo(345, 260);
    ctx.lineTo(305, 260);
    ctx.closePath();
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = '900 40px sans-serif';
    ctx.fillText('HIGH VOLTAGE 11,000V', 300, 425);

    ctx.fillStyle = '#b91c1c';
    ctx.font = '900 34px sans-serif';
    ctx.fillText('DANGER OF DEATH', 300, 475);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(70, 510);
    ctx.lineTo(530, 510);
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = '800 24px sans-serif';
    ctx.fillText('AUTHORIZED PERSONNEL ONLY', 300, 560);

    ctx.fillStyle = '#334155';
    ctx.font = '700 20px sans-serif';
    ctx.fillText('KEEP CLEAR AT ALL TIMES', 300, 605);
  } else if (id === 'hospital-quiet') {
    // 3. Hospital quiet sign
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 600, 700);

    roundRect(ctx, 20, 20, 560, 660, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();

    roundRect(ctx, 40, 40, 520, 85, 10);
    ctx.fillStyle = '#0284c7';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOSPITAL ZONE', 300, 98);

    // Silence Symbol
    ctx.beginPath();
    ctx.arc(300, 220, 70, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f9ff';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();

    ctx.font = '64px sans-serif';
    ctx.fillText('🤫', 300, 242);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 34px sans-serif';
    ctx.fillText('SILENCE PLEASE', 300, 335);

    ctx.fillStyle = '#0369a1';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('ICU & SURGICAL WARDS AHEAD', 300, 375);

    roundRect(ctx, 60, 415, 480, 130, 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('VISITING HOURS STRICTLY', 300, 455);

    ctx.fillStyle = '#0284c7';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('4:00 PM – 6:00 PM ONLY', 300, 498);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 16px sans-serif';
    ctx.fillText('Max 1 Attendant per patient allowed', 300, 528);

    roundRect(ctx, 60, 565, 480, 65, 8);
    ctx.fillStyle = '#fef2f2';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f87171';
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = '800 20px sans-serif';
    ctx.fillText('MASKS & SANITIZATION MANDATORY', 300, 606);
  } else if (id === 'metro-transit') {
    // 4. Metro Transit sign
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 600, 700);

    roundRect(ctx, 20, 20, 560, 660, 20);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    // Hazard stripes banner
    ctx.fillStyle = '#eab308';
    ctx.fillRect(35, 35, 530, 40);

    ctx.lineWidth = 12;
    ctx.strokeStyle = '#000000';
    for (let x = 40; x < 560; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 35);
      ctx.lineTo(x + 30, 75);
      ctx.stroke();
    }

    ctx.fillStyle = '#facc15';
    ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MIND THE GAP', 300, 145);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px sans-serif';
    ctx.fillText('BETWEEN TRAIN & PLATFORM', 300, 190);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(80, 225, 440, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px sans-serif';
    ctx.fillText('STAND BEHIND YELLOW LINE', 300, 280);

    roundRect(ctx, 60, 315, 480, 240, 12);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('1. Let passengers alight first', 90, 365);
    ctx.fillText('2. Do not lean against closing doors', 90, 415);
    ctx.fillText('3. Watch footing while boarding', 90, 465);

    ctx.fillStyle = '#f87171';
    ctx.fillText('4. Emergency stop lever is inside car', 90, 515);

    roundRect(ctx, 60, 575, 480, 65, 8);
    ctx.fillStyle = '#7f1d1d';
    ctx.fill();

    ctx.fillStyle = '#fecaca';
    ctx.font = '800 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OBSTRUCTING DOORS IS PUNISHABLE BY LAW', 300, 615);
  } else if (id === 'campus-exam') {
    // 5. University Exam sign
    ctx.fillStyle = '#e0e7ff';
    ctx.fillRect(0, 0, 600, 700);

    roundRect(ctx, 20, 20, 560, 660, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#4338ca';
    ctx.stroke();

    roundRect(ctx, 40, 40, 520, 90, 10);
    ctx.fillStyle = '#4338ca';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXAMINATION IN PROGRESS', 300, 96);

    ctx.fillStyle = '#1e1b4b';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('STRICT SILENCE ZONE', 300, 185);

    ctx.fillStyle = '#6366f1';
    ctx.font = '700 20px sans-serif';
    ctx.fillText('Hall B-101 to B-120 • 9:00 AM – 1:00 PM', 300, 222);

    roundRect(ctx, 60, 255, 480, 270, 12);
    ctx.fillStyle = '#f5f3ff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c7d2fe';
    ctx.stroke();

    ctx.fillStyle = '#312e81';
    ctx.font = '700 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📵 Mobile Phones Strictly Prohibited', 90, 310);
    ctx.fillText('🪪 Student ID Card Required for Entry', 90, 360);
    ctx.fillText('⌚ Smart Watches Not Permitted', 90, 410);
    ctx.fillText('🚪 Entry Closed 15 Mins After Start', 90, 460);

    roundRect(ctx, 60, 550, 480, 80, 8);
    ctx.fillStyle = '#fff1f2';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e11d48';
    ctx.stroke();

    ctx.fillStyle = '#be123c';
    ctx.font = '800 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POSSESSION OF UNAUTHORIZED MATERIAL', 300, 584);

    ctx.fillStyle = '#e11d48';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('RESULTS IN IMMEDIATE EXPULSION', 300, 612);
  }

  const pngDataUrl = canvas.toDataURL('image/png');
  signDataUrlCache.set(id, pngDataUrl);
  return pngDataUrl;
}

export const SAMPLE_SIGNS: SampleSign[] = SAMPLE_SIGN_DEFS.map((def) => ({
  ...def,
  dataUrl: '', // lazily generated on demand via getSampleSignDataUrl
}));
