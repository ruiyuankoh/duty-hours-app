// Supabase Configuration
const SUPABASE_URL = 'https://ldfsxayxulapbjlyarss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnN4YXl4dWxhcGJqbHlhcnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTU5OTEsImV4cCI6MjA4MjczMTk5MX0.pRTLg5_Tiy2cI3G0XXGVXUKE6VEGanZg0h5UBPQl0yc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentUser = null;
let currentUserProfile = null;
let isSignUp = false;

// DOM Elements
const authContainer = document.getElementById('authContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const errorMessage = document.getElementById('errorMessage');
const userEmail = document.getElementById('userEmail');
const dashboardTitle = document.getElementById('dashboardTitle');
const dutiesList = document.getElementById('dutiesList');
const signupsList = document.getElementById('signupsList');
const statsContainer = document.getElementById('statsContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    signInForm.addEventListener('submit', handleSignIn);
    signUpForm.addEventListener('submit', handleSignUp);
});

// Check if user is logged in
async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            await loadUserProfile();
            showDashboard();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuth();
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;
        currentUserProfile = data;
        updateDashboard();
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile');
    }
}

// Handle Sign In
async function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    try {
        signInForm.querySelector('button').classList.add('loading');
        clearError();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        currentUser = data.user;
        await loadUserProfile();
        showDashboard();
        signInForm.reset();
    } catch (error) {
        showError(error.message || 'Sign in failed');
    } finally {
        signInForm.querySelector('button').classList.remove('loading');
    }
}

// Handle Sign Up
async function handleSignUp(e) {
    e.preventDefault();
    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    const fullName = document.getElementById('signUpName').value;

    try {
        signUpForm.querySelector('button').classList.add('loading');
        clearError();

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;

        // Create user profile
        const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                id: data.user.id,
                email,
                full_name: fullName,
                role: 'user',
            });

        if (profileError) throw profileError;

        showError('Account created! Please sign in.', 'success');
        toggleForms();
        signUpForm.reset();
    } catch (error) {
        showError(error.message || 'Sign up failed');
    } finally {
        signUpForm.querySelector('button').classList.remove('loading');
    }
}

// Toggle between sign in and sign up
function toggleForms() {
    isSignUp = !isSignUp;
    signInForm.classList.toggle('hidden');
    signUpForm.classList.toggle('hidden');
    document.getElementById('toggleText').innerHTML = isSignUp
        ? 'Already have an account? <a onclick="toggleForms()">Sign In</a>'
        : "Don't have an account? <a onclick=\"toggleForms()\">Sign Up</a>";
    clearError();
}

// Show auth container
function showAuth() {
    authContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
}

// Show dashboard
function showDashboard() {
    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    userEmail.textContent = `Welcome, ${currentUserProfile?.full_name || currentUser.email}`;
    if (currentUserProfile?.role === 'admin') {
        dashboardTitle.textContent = 'Admin Dashboard';
    }
    loadDuties();
    loadSignups();
    loadStats();
}

// Update dashboard
async function updateDashboard() {
    userEmail.textContent = `Welcome, ${currentUserProfile?.full_name || currentUser.email}`;
    if (currentUserProfile?.role === 'admin') {
        dashboardTitle.textContent = 'Admin Dashboard';
    }
}

// Load duties
async function loadDuties() {
    try {
        const { data, error } = await supabase
            .from('duties')
            .select('*')
            .eq('status', 'open')
            .order('date', { ascending: true });

        if (error) throw error;

        if (data.length === 0) {
            dutiesList.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">No available duties</li>';
            return;
        }

        dutiesList.innerHTML = data.map(duty => `
            <li class="duty-item">
                <h4>${duty.name} <span class="status-badge status-open">Open</span></h4>
                <p>📅 ${new Date(duty.date).toLocaleDateString()} • ⏰ ${duty.time_start} - ${duty.time_end}</p>
                <p>Type: ${duty.type}</p>
                <button onclick="signUpForDuty('${duty.id}')">Sign Up</button>
            </li>
        `).join('');
    } catch (error) {
        console.error('Error loading duties:', error);
        dutiesList.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">Error loading duties</li>';
    }
}

// Sign up for duty
async function signUpForDuty(dutyId) {
    try {
        const { error } = await supabase
            .from('duty_signups')
            .insert({
                duty_id: dutyId,
                user_id: currentUser.id,
                status: 'pending',
            });

        if (error) throw error;

        showError('Successfully signed up for duty!', 'success');
        loadDuties();
        loadSignups();
    } catch (error) {
        showError(error.message || 'Failed to sign up');
    }
}

// Load signups
async function loadSignups() {
    try {
        const { data, error } = await supabase
            .from('duty_signups')
            .select('*, duties(*)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data.length === 0) {
            signupsList.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">No signups yet</li>';
            return;
        }

        signupsList.innerHTML = data.map(signup => `
            <li class="duty-item">
                <h4>${signup.duties?.name} <span class="status-badge status-${signup.status}">${signup.status}</span></h4>
                <p>📅 ${new Date(signup.duties?.date).toLocaleDateString()}</p>
                ${signup.status === 'pending' ? `<button onclick="cancelSignup('${signup.id}')">Cancel</button>` : ''}
            </li>
        `).join('');
    } catch (error) {
        console.error('Error loading signups:', error);
        signupsList.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">Error loading signups</li>';
    }
}

// Cancel signup
async function cancelSignup(signupId) {
    try {
        const { error } = await supabase
            .from('duty_signups')
            .delete()
            .eq('id', signupId);

        if (error) throw error;

        showError('Signup cancelled', 'success');
        loadDuties();
        loadSignups();
    } catch (error) {
        showError(error.message || 'Failed to cancel signup');
    }
}

// Load stats
async function loadStats() {
    try {
        const { data, error } = await supabase
            .from('duty_signups')
            .select('status')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        const completed = data.filter(s => s.status === 'completed').length;
        const verified = data.filter(s => s.status === 'verified').length;
        const pending = data.filter(s => s.status === 'pending').length;

        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Total Hours</h3>
                <div class="value">${completed * 2}</div>
            </div>
            <div class="stat-card">
                <h3>Completed</h3>
                <div class="value">${completed}</div>
            </div>
            <div class="stat-card">
                <h3>Verified</h3>
                <div class="value">${verified}</div>
            </div>
            <div class="stat-card">
                <h3>Pending</h3>
                <div class="value">${pending}</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Logout
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        currentUser = null;
        currentUserProfile = null;
        showAuth();
        signInForm.reset();
        signUpForm.reset();
        isSignUp = false;
        document.getElementById('toggleText').innerHTML = "Don't have an account? <a onclick=\"toggleForms()\">Sign Up</a>";
    } catch (error) {
        showError(error.message || 'Logout failed');
    }
}

// Error handling
function showError(message, type = 'error') {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    if (type === 'error') {
        errorMessage.style.background = '#fee';
        errorMessage.style.color = '#c33';
    } else {
        errorMessage.style.background = '#efe';
        errorMessage.style.color = '#3c3';
    }
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

function clearError() {
    errorMessage.classList.remove('show');
}
