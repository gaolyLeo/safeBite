// ===== Mock Data =====
// Coordinates centered around CityU / Kowloon Tong, HK
const USER_LAT = 22.3369, USER_LNG = 114.1744; // simulated user @ CityU

const LISTINGS = [
  { id: 1, emoji: '🥖', name: 'Sourdough Bread', category: 'Bakery', expiry: '2026-04-10', distance: 0.3, location: 'Maple St area', pickupWindow: 'Today 5–8 PM', safe: true, commuteMatch: true, neutralSpot: '7-Eleven, 12 Maple St (lobby)', lat: 22.3382, lng: 114.1761 },
  { id: 2, emoji: '🥛', name: 'Organic Milk (1L)', category: 'Dairy', expiry: '2026-04-12', distance: 0.7, location: 'Oak Ave area', pickupWindow: 'Tomorrow 9 AM–12 PM', safe: true, commuteMatch: true, neutralSpot: 'FamilyMart, Oak Ave & 3rd (entrance)', lat: 22.3401, lng: 114.1718 },
  { id: 3, emoji: '🍎', name: 'Fresh Apples ×6', category: 'Produce', expiry: '2026-04-15', distance: 0.9, location: 'Elm Rd area', pickupWindow: 'Flexible', safe: true, commuteMatch: false, neutralSpot: 'Community Notice Board, Elm Rd Park', lat: 22.3348, lng: 114.1779 },
  { id: 4, emoji: '🥫', name: 'Canned Tomatoes ×2', category: 'Pantry', expiry: '2027-01-01', distance: 0.4, location: 'Pine Blvd area', pickupWindow: 'Weekends', safe: true, commuteMatch: false, neutralSpot: 'Library foyer, 88 Pine Blvd', lat: 22.3358, lng: 114.1752 },
  { id: 5, emoji: '🍞', name: 'Whole Wheat Loaf', category: 'Bakery', expiry: '2026-04-11', distance: 0.6, location: 'Cedar Lane area', pickupWindow: 'Today 6–9 PM', safe: true, commuteMatch: false, neutralSpot: 'Bus stop shelter, Cedar Lane (stop #14)', lat: 22.3391, lng: 114.1708 },
  { id: 6, emoji: '🧀', name: 'Cheddar Block', category: 'Dairy', expiry: '2026-04-20', distance: 0.8, location: 'Birch St area', pickupWindow: 'Flexible', safe: true, commuteMatch: false, neutralSpot: 'Café Birch waiting area (mention EcoShare)', lat: 22.3375, lng: 114.1783 },
  { id: 7, emoji: '🥚', name: 'Free-range Eggs ×6', category: 'Dairy', expiry: '2026-04-18', distance: 0.5, location: 'Willow Dr area', pickupWindow: 'Mornings', safe: true, commuteMatch: false, neutralSpot: 'Building A lobby, Willow Garden Estate', lat: 22.3412, lng: 114.1735 },
  { id: 8, emoji: '🍊', name: 'Valencia Oranges ×4', category: 'Produce', expiry: '2026-04-14', distance: 0.2, location: 'Rosewood area', pickupWindow: 'Afternoons', safe: true, commuteMatch: false, neutralSpot: 'Rosewood Community Hub, ground floor', lat: 22.3361, lng: 114.1766 },
];

// ===== Simulated AI Scan =====
// Returns: { status: 'safe'|'warn', expiry: string, message: string }
function simulateAIScan(fileName) {
  const lower = (fileName || '').toLowerCase();
  const hasBlur = lower.includes('blurry') || lower.includes('torn') || lower.includes('unclear');
  return new Promise(resolve => {
    setTimeout(() => {
      if (hasBlur) {
        resolve({ status: 'warn', expiry: null, message: 'Label unclear — please retake the photo for verification.' });
      } else {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const year = 2026 + Math.floor(Math.random() * 2);
        const month = months[Math.floor(Math.random() * 12)];
        resolve({ status: 'safe', expiry: `${month} ${year}`, message: `Expiry detected: ${month} ${year} — Safe to share.` });
      }
    }, 1800 + Math.random() * 800);
  });
}

// ===== Badge System =====
const BADGES = [
  { id: 'eco_hero', icon: '🌿', name: 'Eco Hero', desc: 'Share your first item', threshold: 1, stat: 'shared' },
  { id: 'first_claim', icon: '🤝', name: 'Good Neighbor', desc: 'Claim your first item', threshold: 1, stat: 'claimed' },
  { id: 'commute_rescuer', icon: '🚗', name: 'Commute Rescuer', desc: 'Use commute matching', threshold: 1, stat: 'commute' },
  { id: 'super_sharer', icon: '🌟', name: 'Super Sharer', desc: 'Share 5 items', threshold: 5, stat: 'shared' },
  { id: 'carbon_saver', icon: '♻️', name: 'Carbon Saver', desc: 'Save 1 kg CO₂', threshold: 1, stat: 'co2' },
  { id: 'community_star', icon: '🏆', name: 'Community Star', desc: 'Earn 10+ ratings', threshold: 10, stat: 'ratings' },
];

function getStats() {
  return JSON.parse(localStorage.getItem('safebite_stats') || JSON.stringify({
    shared: 0, claimed: 0, commute: 0, co2: 0, ratings: 0
  }));
}

function saveStats(stats) {
  localStorage.setItem('safebite_stats', JSON.stringify(stats));
}

// Only seeds keys that don't exist yet — won't overwrite actions taken before first profile visit
function seedStatsIfNew() {
  const seed = { shared: 3, claimed: 2, commute: 1, co2: 2, ratings: 4 };
  if (localStorage.getItem('safebite_seeded')) return;
  saveStats(seed);
  localStorage.setItem('safebite_seeded', '1');
}

function incrementStat(key, amount = 1) {
  const s = getStats();
  s[key] = (s[key] || 0) + amount;
  saveStats(s);
  return s;
}

// ===== Claimed Items (session-only, resets on refresh) =====
const _claimedIds = [];
function getClaimedIds() { return _claimedIds; }
function addClaimedId(id) { if (!_claimedIds.includes(id)) _claimedIds.push(id); }

function getUnlockedBadges() {
  const stats = getStats();
  return BADGES.map(b => ({
    ...b,
    unlocked: (stats[b.stat] || 0) >= b.threshold
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
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== Format expiry relative label =====
function expiryLabel(dateStr) {
  const today = new Date();
  const exp = new Date(dateStr);
  const diff = Math.ceil((exp - today) / 86400000);
  if (diff <= 1) return { text: 'Expires today', cls: 'pill-orange' };
  if (diff <= 3) return { text: `Expires in ${diff}d`, cls: 'pill-amber' };
  return { text: `Exp ${exp.toLocaleDateString('en',{month:'short',day:'numeric'})}`, cls: 'pill-green' };
}

document.addEventListener('DOMContentLoaded', highlightNav);
