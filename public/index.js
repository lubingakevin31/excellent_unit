
        let currentMode = 'login';

        // Gestion de l'affichage de l'en-tête au scroll
        window.addEventListener('scroll', () => {
            const header = document.getElementById('main-header');
            if (header) {
                if (window.scrollY > 80) {
                    header.classList.add('visible');
                } else {
                    header.classList.remove('visible');
                }
            }
        });

        function toggleMobileMenu() {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu) mobileMenu.classList.toggle('active');
        }

        function openModal(mode) {
            currentMode = mode;
            const modal = document.getElementById('auth-modal');
            const title = document.getElementById('modal-title');
            const desc = document.getElementById('modal-desc');
            const submitBtn = document.getElementById('auth-submit-btn');
            const nameContainer = document.getElementById('name-field-container');
            const msgBox = document.getElementById('modal-message');
            const switchFooter = document.getElementById('modal-switch-footer');
            
            if (msgBox) msgBox.style.display = 'none';

            if (mode === 'register') {
                if (title) title.textContent = "Inscription";
                if (desc) desc.textContent = "Créez votre compte membre dès aujourd'hui.";
                if (submitBtn) submitBtn.textContent = "S'inscrire";
                if (nameContainer) nameContainer.style.display = 'block';
                const nameInput = document.getElementById('name-input');
                if (nameInput) nameInput.setAttribute('required', 'true');
                if (switchFooter) switchFooter.innerHTML = `Vous avez déjà un compte ? <span onclick="openModal('login')" style="color: var(--brand-gold); font-weight: bold; cursor: pointer;">Se connecter</span>`;
            } else {
                if (title) title.textContent = "Connexion";
                if (desc) desc.textContent = "Accédez à votre espace sécurisé.";
                if (submitBtn) submitBtn.textContent = "Se connecter";
                if (nameContainer) nameContainer.style.display = 'none';
                const nameInput = document.getElementById('name-input');
                if (nameInput) nameInput.removeAttribute('required');
                if (switchFooter) switchFooter.innerHTML = `Voulez-vous vous inscrire ? <span onclick="openModal('register')" style="color: var(--brand-gold); font-weight: bold; cursor: pointer;">Créer un compte</span>`;
            }
            if (modal) modal.classList.add('active');
        }

        function closeModal() {
            const modal = document.getElementById('auth-modal');
            if (modal) modal.classList.remove('active');
        }

        function closeModalOutside(event) {
            if (event.target.id === 'auth-modal') closeModal();
        }

        async function fetchUsersCount() {
            try {
                const res = await fetch('/api/users/count');
                const data = await res.json();
                const countElem = document.getElementById('users-count');
                if (countElem) countElem.textContent = data.count ?? 0;
            } catch (e) {
                const countElem = document.getElementById('users-count');
                if (countElem) countElem.textContent = "0";
            }
        }

        // --- GESTION DU COMPTEUR ET DU BOUTON "JE SUIS PARTANT" ---
        async function fetchPartantCount() {
            try {
                const res = await fetch('/api/partant/count');
                const data = await res.json();
                const count = data.count ?? 120; // Valeur par défaut si l'API retourne vide
                updatePartantUI(count);
            } catch (e) {
                updatePartantUI(120); // Fallback local
            }
        }

        function updatePartantUI(count) {
            const counterText = document.getElementById('partant-count-text');
            const partantBtn = document.getElementById('btn-partant-action');
            
            if (counterText) {
                counterText.textContent = `${count} soutien${count > 1 ? 's' : ''}`;
            }

            // Vérification si l'utilisateur a déjà cliqué dans ce navigateur
            const hasSupported = localStorage.getItem('hasSupportedPartant') === 'true';
            if (hasSupported && partantBtn) {
                partantBtn.textContent = "Déjà engagé ✓";
                partantBtn.style.background = "transparent";
                partantBtn.style.border = "1px solid #22c55e";
                partantBtn.style.color = "#22c55e";
                partantBtn.disabled = true;
            }
        }

        async function handlePartantClick() {
            const partantBtn = document.getElementById('btn-partant-action');
            
            // Condition de sécurité locale anti-spam / double clic
            if (localStorage.getItem('hasSupportedPartant') === 'true') {
                return;
            }

            try {
                // Tentative d'appel API serveur si configuré
                const res = await fetch('/api/partant', { method: 'POST' });
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('hasSupportedPartant', 'true');
                    fetchPartantCount();
                } else {
                    throw new Error(data.error || "Action déjà enregistrée.");
                }
            } catch (err) {
                // Mode résilient : si l'API n'est pas encore active, on simule l'incrémentation locale
                let currentCount = parseInt(localStorage.getItem('localPartantCount') || '120', 10) + 1;
                localStorage.setItem('localPartantCount', currentCount);
                localStorage.setItem('hasSupportedPartant', 'true');
                
                updatePartantUI(currentCount);
                
                // Petit retour visuel élégant
                if (partantBtn) {
                    partantBtn.textContent = "Merci !";
                }
            }
        }
        // ---------------------------------------------------------

        async function handleAuthSubmit(event) {
            event.preventDefault();
            const emailInput = document.getElementById('email-input');
            const passwordInput = document.getElementById('password-input');
            const nameInput = document.getElementById('name-input');
            const submitBtn = document.getElementById('auth-submit-btn');
            const msgBox = document.getElementById('modal-message');

            if (!emailInput || !passwordInput || !submitBtn) return;

            const email = emailInput.value;
            const password = passwordInput.value;
            const nameInputVal = nameInput ? nameInput.value : '';
            const name = nameInputVal || email.split('@')[0];

            submitBtn.disabled = true;
            submitBtn.textContent = "Patientez...";

            const endpoint = currentMode === 'register' ? '/api/register' : '/api/login';
            const payload = currentMode === 'register' ? { name, email, password } : { email, password };

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok) {
                    if (msgBox) {
                        msgBox.style.display = 'block';
                        msgBox.style.color = '#34d399';
                        msgBox.style.background = 'rgba(52, 211, 153, 0.1)';
                        msgBox.style.borderColor = 'rgba(52, 211, 153, 0.3)';
                        msgBox.textContent = data.message || "Succès !";
                    }

                    const userNameToStore = data.user?.name || data.name || name;
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userName', userNameToStore);

                    if (currentMode === 'register') fetchUsersCount();

                    setTimeout(() => { 
                        closeModal(); 
                        checkAuthStatus(); 
                    }, 1000);
                } else {
                    throw new Error(data.error || data.message || "Erreur de connexion.");
                }
            } catch (err) {
                if (msgBox) {
                    msgBox.style.display = 'block';
                    msgBox.style.color = '#f87171';
                    msgBox.style.background = 'rgba(248, 113, 113, 0.1)';
                    msgBox.style.borderColor = 'rgba(248, 113, 113, 0.3)';
                    msgBox.textContent = err.message;
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = currentMode === 'register' ? "S'inscrire" : "Se connecter";
            }
        }

        function checkAuthStatus() {
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            const userName = localStorage.getItem('userName') || 'Membre';

            const loginBtn = document.getElementById('btn-login-nav');
            const desktopGroup = document.getElementById('desktop-actions-group');
            const mobileAuthLinks = document.getElementById('mobile-auth-links');

            if (isLoggedIn === 'true') {
                if (loginBtn) loginBtn.style.display = 'none';
                if (desktopGroup) {
                    desktopGroup.innerHTML = `
                        <span style="color: var(--brand-gold); font-size: 0.85rem; font-weight: bold;">👋 ${userName}</span>
                        <button onclick="logout()" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 0.3rem 0.7rem; border-radius: 8px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">Déconnexion</button>
                        <button onclick="toggleTheme()" style="background: transparent; border: 1px solid var(--border-color); color: var(--brand-gold); padding: 0.4rem 0.6rem; border-radius: 8px; cursor: pointer;" aria-label="Changer de thème">🌓</button>
                    `;
                }
                if (mobileAuthLinks) {
                    mobileAuthLinks.innerHTML = `
                        <div style="text-align: center; color: var(--brand-gold); font-size: 0.9rem; font-weight: bold; margin-bottom: 0.75rem;">👋 ${userName}</div>
                        <button onclick="logout()" style="width: 100%; background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 0.75rem; border-radius: 10px; font-weight: bold; text-align: center; margin-bottom: 0.75rem; cursor: pointer;">Déconnexion</button>
                    `;
                }
            }
        }

        function logout() {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userName');
            location.reload();
        }

        function toggleTheme() {
            const body = document.body;
            body.classList.toggle('dark');
            body.classList.toggle('light');
            localStorage.setItem('theme', body.classList.contains('light') ? 'light' : 'dark');
        }

        window.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('login') === 'success') {
                const googleName = urlParams.get('name') || 'Membre Google';
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userName', googleName);
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            if (localStorage.getItem('theme') === 'light') {
                document.body.classList.remove('dark');
                document.body.classList.add('light');
            }
            fetchUsersCount();
            fetchPartantCount();
            checkAuthStatus();
        });

        // Fonction de copie automatique dans le presse-papier avec retour visuel
        function copyToClipboard(text, btnElement) {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = btnElement.innerText;
                btnElement.innerText = "Copié !";
                btnElement.style.borderColor = "#22c55e";
                btnElement.style.color = "#22c55e";
                
                setTimeout(() => {
                    btnElement.innerText = originalText;
                    btnElement.style.borderColor = "var(--brand-gold, #d4af37)";
                    btnElement.style.color = "var(--brand-gold, #d4af37)";
                }, 2000);
            }).catch(err => {
                console.error('Erreur lors de la copie : ', err);
            });
        }

        // Gestion de l'ouverture de la modale de rendez-vous stratégique
        function openRdvModal() {
            const modal = document.getElementById('rdv-modal');
            if (modal) modal.classList.add('active');
        }

        // Gestion de la fermeture de la modale
        function closeRdvModal() {
            const modal = document.getElementById('rdv-modal');
            if (modal) modal.classList.remove('active');
        }

        // Fermeture de la modale si l'utilisateur clique en dehors de la carte
        function closeRdvModalOutside(event) {
            const modal = document.getElementById('rdv-modal');
            if (event.target === modal) closeRdvModal();
        }

        // Traitement et soumission du formulaire de rendez-vous vers les e-mails cibles
        function submitRdvForm(event) {
            event.preventDefault();
            
            const nameInput = document.getElementById('rdv-name');
            const emailInput = document.getElementById('rdv-email');
            const orgInput = document.getElementById('rdv-org');
            const subjectInput = document.getElementById('rdv-subject');

            if (!nameInput || !emailInput || !subjectInput) return;

            const name = nameInput.value;
            const email = emailInput.value;
            const org = orgInput ? orgInput.value : '';
            const subject = subjectInput.value;

            const mailtoLink = `mailto:davidmathec@gmail.com,excellentunit@gmail.com?subject=Demande de RDV Stratégique : ${encodeURIComponent(subject)}&body=Nom: ${encodeURIComponent(name)}%0D%0AEmail: ${encodeURIComponent(email)}%0D%0AOrganisation: ${encodeURIComponent(org)}%0D%0A%0D%0AObjet:%0D%0A${encodeURIComponent(subject)}`;
            
            window.location.href = mailtoLink;
            closeRdvModal();
        }
  