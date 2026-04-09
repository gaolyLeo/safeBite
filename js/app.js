// ===== Mock Data =====
// Coarse map centers only. These represent neighborhood zones, not exact addresses.
const USER_AREA = {
  name: 'Kowloon Tong zone',
  lat: 22.3369,
  lng: 114.1744,
};

const LISTINGS = [
  { id: 1, emoji: '🥖', name: 'Sourdough Bread', category: 'Bakery', expiry: '2026-04-10', distance: 0.3, area: 'Maple District', pickupWindow: 'Today 5-8 PM', safe: true, commuteMatch: true, neutralSpot: 'Maple Community Hub entrance', zoneLat: 22.3382, zoneLng: 114.1761 },
  { id: 2, emoji: '🥛', name: 'Organic Milk (1L)', category: 'Dairy', expiry: '2026-04-12', distance: 0.7, area: 'Oak Avenue zone', pickupWindow: 'Tomorrow 9 AM-2 PM', safe: true, commuteMatch: true, neutralSpot: 'Oak Avenue transit kiosk', zoneLat: 22.3401, zoneLng: 114.1718 },
  { id: 3, emoji: '🍎', name: 'Fresh Apples x6', category: 'Produce', expiry: '2026-04-15', distance: 0.9, area: 'Elm Park zone', pickupWindow: 'Flexible', safe: true, commuteMatch: false, neutralSpot: 'Elm Park notice board', zoneLat: 22.3348, zoneLng: 114.1779 },
  { id: 4, emoji: '🥫', name: 'Canned Tomatoes x2', category: 'Pantry', expiry: '2027-01-01', distance: 0.4, area: 'Pine Boulevard zone', pickupWindow: 'Weekends', safe: true, commuteMatch: false, neutralSpot: 'Pine Library foyer', zoneLat: 22.3358, zoneLng: 114.1752 },
  { id: 5, emoji: '🍞', name: 'Whole Wheat Loaf', category: 'Bakery', expiry: '2026-04-11', distance: 0.6, area: 'Cedar Lane zone', pickupWindow: 'Today 6-9 PM', safe: true, commuteMatch: false, neutralSpot: 'Cedar Lane bus shelter', zoneLat: 22.3391, zoneLng: 114.1708 },
  { id: 6, emoji: '🧀', name: 'Cheddar Block', category: 'Dairy', expiry: '2026-04-20', distance: 0.8, area: 'Birch Street zone', pickupWindow: 'Flexible', safe: true, commuteMatch: false, neutralSpot: 'Birch Cafe waiting area', zoneLat: 22.3375, zoneLng: 114.1783 },
  { id: 7, emoji: '🥚', name: 'Free-range Eggs x6', category: 'Dairy', expiry: '2026-04-18', distance: 0.5, area: 'Willow Garden zone', pickupWindow: 'Mornings', safe: true, commuteMatch: false, neutralSpot: 'Willow Garden lobby desk', zoneLat: 22.3412, zoneLng: 114.1735 },
  { id: 8, emoji: '🍊', name: 'Valencia Oranges x4', category: 'Produce', expiry: '2026-04-14', distance: 0.2, area: 'Rosewood zone', pickupWindow: 'Afternoons', safe: true, commuteMatch: false, neutralSpot: 'Rosewood Community Hub', zoneLat: 22.3361, zoneLng: 114.1766 },
];

const DEFAULT_STATS = { shared: 0, claimed: 0, commute: 0, co2: 0, ratings: 0 };
const DEMO_STATS = { shared: 3, claimed: 2, commute: 1, co2: 2, ratings: 4 };

// ===== Simulated AI Scan =====
// Returns:
// {
//   status: 'verified' | 'needs_review',
//   confidence: number,
//   detectedDate: string | null,
//   labelType: 'expiry' | 'best_before' | 'unknown',
//   message: string
// }
function hashString(input = '') {
  let hash = 0;
  for (const ch of input) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function parseISODateLocal(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function deterministicOffset(seedKey, scale = 0.0011) {
  const seed = hashString(seedKey);
  const latOffset = (((seed % 1000) / 999) - 0.5) * scale;
  const lngOffset = ((((Math.floor(seed / 7)) % 1000) / 999) - 0.5) * scale;
  return { latOffset, lngOffset };
}

function getMaskedCoords(item) {
  const { latOffset, lngOffset } = deterministicOffset(`${item.id}-${item.area}`);
  return {
    lat: item.zoneLat + latOffset,
    lng: item.zoneLng + lngOffset,
  };
}

function simulateAIScan(file) {
  const name = file?.name || 'upload.jpg';
  const lower = name.toLowerCase();
  const size = file?.size || 0;
  const type = file?.type || '';
  const seed = hashString(`${name}:${size}:${type}`);
  const delay = 1400 + (seed % 900);
  const qualityPenalty = (
    (lower.includes('blurry') || lower.includes('unclear') ? 0.2 : 0) +
    (lower.includes('dark') || lower.includes('tilt') ? 0.12 : 0) +
    (size > 0 && size < 120000 ? 0.14 : 0)
  );
  const baseConfidence = 0.92 - qualityPenalty - ((seed % 18) / 100);
  const confidence = Math.max(0.51, Math.min(0.96, Number(baseConfidence.toFixed(2))));
  const status = confidence >= 0.78 ? 'verified' : 'needs_review';
  const labelType = seed % 5 === 0 ? 'best_before' : 'expiry';

  const today = startOfToday();
  const daysAhead = 2 + (seed % 10);
  const detected = new Date(today);
  detected.setDate(today.getDate() + daysAhead);
  const detectedDate = status === 'verified' ? detected.toISOString().slice(0, 10) : null;

  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (!type.startsWith('image/')) {
        reject(new Error('Unsupported file type'));
        return;
      }

      if (status === 'verified') {
        resolve({
          status,
          confidence,
          detectedDate,
          labelType,
          message: `${labelType === 'best_before' ? 'Best before' : 'Expiry'} date read with ${Math.round(confidence * 100)}% confidence.`,
        });
        return;
      }

      resolve({
        status,
        confidence,
        detectedDate: null,
        labelType: 'unknown',
        message: 'Label looks partially obscured. Please retake the photo in better lighting.',
      });
    }, delay);
  });
}

// ===== Badge System =====
const BADGES = [
  { id: 'eco_hero', icon: '🌿', name: 'Eco Hero', desc: 'Share your first item', threshold: 1, stat: 'shared' },
  { id: 'first_claim', icon: '🤝', name: 'Good Neighbor', desc: 'Claim your first item', threshold: 1, stat: 'claimed' },
  { id: 'commute_rescuer', icon: '🛤️', name: 'Commute Rescuer', desc: 'Use commute matching', threshold: 1, stat: 'commute' },
  { id: 'super_sharer', icon: '🏅', name: 'Super Sharer', desc: 'Share 5 items', threshold: 5, stat: 'shared' },
  { id: 'carbon_saver', icon: '♻️', name: 'Carbon Saver', desc: 'Save 1 kg CO2', threshold: 1, stat: 'co2' },
  { id: 'community_star', icon: '🌟', name: 'Community Star', desc: 'Earn 10+ ratings', threshold: 10, stat: 'ratings' },
];

function getStats() {
  try {
    const raw = localStorage.getItem('safebite_stats');
    const parsed = raw ? JSON.parse(raw) : null;
    return { ...DEFAULT_STATS, ...(parsed || {}) };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats) {
  localStorage.setItem('safebite_stats', JSON.stringify({ ...DEFAULT_STATS, ...stats }));
}

function seedStatsIfNew() {
  const existing = localStorage.getItem('safebite_stats');
  if (existing) return;
  saveStats(DEMO_STATS);
  localStorage.setItem('safebite_seeded', '1');
}

function incrementStat(key, amount = 1) {
  const s = getStats();
  s[key] = (s[key] || 0) + amount;
  saveStats(s);
  return s;
}

// ===== Claimed Items (session-only) =====
function getClaimedIds() {
  try {
    return JSON.parse(sessionStorage.getItem('safebite_claimed_ids') || '[]');
  } catch {
    return [];
  }
}

function addClaimedId(id) {
  const claimed = getClaimedIds();
  if (claimed.includes(id)) return claimed;
  claimed.push(id);
  sessionStorage.setItem('safebite_claimed_ids', JSON.stringify(claimed));
  return claimed;
}

function getUnlockedBadges() {
  const stats = getStats();
  return BADGES.map(b => ({
    ...b,
    unlocked: (stats[b.stat] || 0) >= b.threshold,
  }));
}

// ===== Shared Nav Highlight =====
function highlightNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// ===== Toast =====
let toastTimer = null;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== Format expiry relative label =====
function expiryLabel(dateStr) {
  const exp = parseISODateLocal(dateStr);
  if (!exp) return { text: 'Date unavailable', cls: 'pill-gray' };

  const today = startOfToday();
  const diff = Math.round((exp - today) / 86400000);
  if (diff < 0) return { text: 'Expired', cls: 'pill-orange' };
  if (diff === 0) return { text: 'Expires today', cls: 'pill-orange' };
  if (diff <= 3) return { text: `Expires in ${diff}d`, cls: 'pill-amber' };
  return { text: `Exp ${exp.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`, cls: 'pill-green' };
}

document.addEventListener('DOMContentLoaded', highlightNav);
