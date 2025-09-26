// প্রাথমিক গ্লোবাল ভ্যারিয়েবল
let auth, db;
let onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword;
let getDocs, collection, doc, getDoc, setDoc, query, where;

const courseGrid = document.getElementById('course-grid');
const authLink = document.getElementById('auth-link');
const loadingStatus = document.getElementById('loading-status');
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthBtn = document.getElementById('toggle-auth-btn');
const closeBtn = document.querySelector('.close-modal-btn');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const sortSelect = document.getElementById('sort-select');
const loadMoreBtn = document.getElementById('load-more-btn');
const heroGetStarted = document.getElementById('hero-get-started');

// Default thumbnail used when a course doesn't provide one
const DEFAULT_THUMB = 'https://i.postimg.cc/HL4QQ9R6/Whats-App-Image-2025-09-26-at-21-14-49-81ac97cb.jpg';

let isSigningUp = false;
let allCourses = [];       // master list
let filteredCourses = [];  // current filtered list
let renderIndex = 0;       // pagination cursor
const PAGE_SIZE = 12;

// Demo data (fallback if Firebase not configured)
const demoCourses = Array.from({ length: 48 }).map((_, i) => {
  const categories = ['development', 'design', 'data', 'mobile', 'language'];
  const titles = [
    'Full Stack Web Development', 'Web and Mobile Design',
    'Fundamentals of C++', 'Beginning Java Programming',
    'Basic Principles of Python', 'Graphics Design Fundamentals',
    'React & Redux Mastery', 'Node.js API Bootcamp',
    'Data Science with Pandas', 'Machine Learning Essentials',
    'Flutter Mobile Apps', 'Kotlin for Android',
    'TypeScript Deep Dive', 'Next.js & SSR',
    'UI/UX Research Basics', 'Figma Advanced',
  ];
  const t = titles[i % titles.length];
  const cat = categories[i % categories.length];
  const price = `${(1999 + (i%7)*500)} BDT`;
  const rating = (4 + (i % 10)/10).toFixed(1); // 4.0 - 4.9
  const reviews = (1 + i) * 73;
  const instructor = ['Talha', 'Hasan', 'Aysha', 'Monirul', 'Rafi'][i % 5];
  return {
    id: `demo-${i+1}`,
    title: t,
    category: cat,
    instructor,
    price,
    rating,
    reviews,
    short: 'এই কোর্সটি আপনাকে ' + t + ' সম্পর্কে প্রাথমিক থেকে উন্নত স্তর পর্যন্ত দক্ষতা অর্জনে সাহায্য করবে। ',
    thumbnail: DEFAULT_THUMB,
  };
});

// Firebase গ্লোবাল ইনিটের জন্য অপেক্ষা
function waitForFirebaseInit(timeout = 1500, interval = 50) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      if (window.authFunctions && window.firebaseAuth && window.firestoreFunctions && window.firebaseDB) {
        return resolve();
      }
      if (Date.now() - start > timeout) return reject(new Error('Timed out waiting for Firebase to initialize'));
      setTimeout(check, interval);
    })();
  });
}
function initFirebaseBindings() {
  auth = window.firebaseAuth;
  db = window.firebaseDB;
  ({ onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } = window.authFunctions);
  ({ getDocs, collection, doc, getDoc, setDoc, query, where } = window.firestoreFunctions);
}

// --------------------------- Auth & Modal ---------------------------
document.addEventListener('click', (e) => {
  if (e.target.id === 'auth-link') {
    e.preventDefault();
    if (authLink.textContent.includes('Dashboard')) {
      // go to dashboard when logged in
      window.location.href = 'dashboard.html';
    } else {
      authModal.classList.remove('hidden');
    }
  }
});
closeBtn && closeBtn.addEventListener('click', () => authModal.classList.add('hidden'));
toggleAuthBtn && toggleAuthBtn.addEventListener('click', () => {
  isSigningUp = !isSigningUp;
  authSubmitBtn.textContent = isSigningUp ? 'Register' : 'Login';
  toggleAuthBtn.textContent = isSigningUp ? 'Go to Login Page' : 'Register';
});
authForm && authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  if (isSigningUp) await handleSignUp(email, password);
  else await handleSignIn(email, password);
});
async function handleSignUp(email, password) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    // create a user profile document in Firestore
    try {
      const user = auth.currentUser;
      const name = document.getElementById('auth-name')?.value || '';
      if (user && setDoc && doc) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          name: name || user.email.split('@')[0],
          photoURL: '',
          bio: '',
          role: 'student'
        });
      }
    } catch (e) { console.warn('Failed to create user profile:', e); }
    alert('Registration successful! Welcome to the Dashboard.');
    authModal.classList.add('hidden');
  } catch (error) { alert(`Registration failed: ${error.message}`); }
}
async function handleSignIn(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert('Login successful! Welcome to the Dashboard.');
    authModal.classList.add('hidden');
  } catch (error) { alert(`Login failed: ${error.message}`); }
}
function handleSignOut() { signOut(auth); }
function setupAuthStateListener() {
  if (typeof onAuthStateChanged !== 'function' || !auth) return;
  onAuthStateChanged(auth, (user) => {
    if (user) {
      authLink.textContent = 'Dashboard';
      authLink.href = 'dashboard.html';
    } else {
      authLink.textContent = 'Login / Sign Up';
      authLink.href = '#';
    }
  });
}

// --------------------------- Load Courses ---------------------------

   async function loadCoursesFromDB() {
  loadingStatus.textContent = 'কোর্স লোড হচ্ছে...';

  let fetched = [];
  try {
    if (db && getDocs) {
      const snap = await getDocs(collection(db, 'courses'));
      snap.forEach(docu => {
        const c = docu.data();
        fetched.push({
          id: docu.id,
          title: c.title || 'Untitled Course',
          category: c.category || '',
          instructor: c.instructor || 'অজানা',
          price: c.price || 'যোগাযোগ করুন',
          rating: Number(c.rating || 4.5),
          reviews: Number(c.reviews || 100),
          short: c.short || 'কোর্সের সংক্ষিপ্ত বর্ণনা পাওয়া যায়নি।',
            thumbnail: (c.thumbnail && c.thumbnail.trim()) ? c.thumbnail : DEFAULT_THUMB,
        });
      });
    }
  } catch (e) {
    console.warn("Firebase থেকে ডেটা আনতে সমস্যা:", e);
  }

  // সবসময় ডেমো + Firebase ডেটা একসাথে মার্জ হবে
  allCourses = fetched.concat(demoCourses);

  // ফিল্টার/রেন্ডার রিসেট
  filteredCourses = allCourses.slice();
  renderIndex = 0;
  courseGrid.innerHTML = '';
  loadingStatus.classList.add('hidden');

  renderNextPage();
  setupScrollAnimation();
}

// --------------------------- Render & Pagination ---------------------------
function renderNextPage() {
  const slice = filteredCourses.slice(renderIndex, renderIndex + PAGE_SIZE);
  slice.forEach((course, idx) => {
    const card = document.createElement('div');
    card.classList.add('course-card');
    card.style.transitionDelay = `${0.05 * idx}s`;
    card.innerHTML = `
      <div class="card-image"><img src="${course.thumbnail || DEFAULT_THUMB}" alt="${course.title}" /></div>
      <div class="card-top">
        <h3>${course.title}</h3>
        <span class="badge">${labelForCategory(course.category)}</span>
      </div>
      <p style="opacity:0.85;font-size:0.9em;">প্রশিক্ষক: ${course.instructor}</p>
      <p class="card-rating">⭐ ${course.rating} • ${formatReviews(course.reviews)}</p>
      <p style="opacity:0.85">${course.short}</p>
      <div class="card-footer">
        <span class="price">${course.price}</span>
        <a href="course-details.html?id=${course.id}" class="glass-button primary details-btn">বিস্তারিত</a>
      </div>
    `;
    courseGrid.appendChild(card);
  });
  renderIndex += slice.length;
  if (renderIndex >= filteredCourses.length) {
    loadMoreBtn.classList.add('hidden');
  } else {
    loadMoreBtn.classList.remove('hidden');
  }
}
loadMoreBtn && loadMoreBtn.addEventListener('click', renderNextPage);

// --------------------------- Search/Filter/Sort ---------------------------
function labelForCategory(cat) {
  switch(cat) {
    case 'development': return 'ডেভ';
    case 'design': return 'ডিজাইন';
    case 'data': return 'ডেটা';
    case 'mobile': return 'মোবাইল';
    case 'language': return 'ভাষা';
    default: return 'সাধারণ';
  }
}
function formatReviews(n) {
  if (n >= 1000) return `${(n/1000).toFixed(1)}k রিভিউ`;
  return `${n} রিভিউ`;
}
function applyFilters() {
  const q = (searchInput?.value || '').toLowerCase().trim();
  const cat = categorySelect?.value || '';
  const sortKey = sortSelect?.value || 'popular';

  filteredCourses = allCourses.filter(c => {
    const matchesText = !q || (c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    const matchesCat = !cat || c.category === cat;
    return matchesText && matchesCat;
  });

  switch (sortKey) {
    case 'rating':
      filteredCourses.sort((a,b) => b.rating - a.rating); break;
    case 'reviews':
      filteredCourses.sort((a,b) => b.reviews - a.reviews); break;
    case 'price-low':
      filteredCourses.sort((a,b) => priceValue(a.price) - priceValue(b.price)); break;
    case 'price-high':
      filteredCourses.sort((a,b) => priceValue(b.price) - priceValue(a.price)); break;
    default:
      filteredCourses.sort((a,b) => b.reviews + b.rating*50 - (a.reviews + a.rating*50)); // popularity heuristic
  }

  courseGrid.innerHTML = '';
  renderIndex = 0;
  renderNextPage();
  setupScrollAnimation();
}
function priceValue(p) {
  const n = (p || '').replace(/[^0-9]/g, '');
  return n ? parseInt(n, 10) : 0;
}
searchInput && searchInput.addEventListener('input', debounce(applyFilters, 250));
categorySelect && categorySelect.addEventListener('change', applyFilters);
sortSelect && sortSelect.addEventListener('change', applyFilters);
heroGetStarted && heroGetStarted.addEventListener('click', () => {
  document.getElementById('hero-email').value = '';
  window.location.hash = '#shop';
  window.scrollTo({ top: document.getElementById('shop').offsetTop - 60, behavior: 'smooth' });
});

// --------------------------- Scroll Animation ---------------------------
function setupScrollAnimation() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.course-card').forEach(el => observer.observe(el));
}

// --------------------------- Utils ---------------------------
function debounce(fn, delay) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// --------------------------- Init ---------------------------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await waitForFirebaseInit();
    initFirebaseBindings();
  } catch (err) {
    // Firebase not ready; we'll use demo fallback
  }
  try { setupAuthStateListener(); } catch(e) {}
  await loadCoursesFromDB();
});

// Hamburger menu toggle (mobile)
const menuToggle = document.getElementById('menu-toggle');
const desktopNav = document.querySelector('.desktop-nav');
if (menuToggle && desktopNav) {
  menuToggle.addEventListener('click', () => {
    desktopNav.classList.toggle('open');
    // simple aria toggle
    const expanded = desktopNav.classList.contains('open');
    menuToggle.setAttribute('aria-expanded', expanded);
  });
}
