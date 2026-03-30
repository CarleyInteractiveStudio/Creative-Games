document.addEventListener('DOMContentLoaded', async () => {
    const chatContainer = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const charCount = document.getElementById('chat-char-count');
    const cooldownBox = document.getElementById('cooldown-box');
    const cooldownTimer = document.getElementById('cooldown-timer');

    let currentUser = null;

    // 1. Initial Load
    await initChat();

    // 2. Poll for new messages every 10 seconds
    setInterval(async () => {
        await loadMessages();
    }, 10000);

    // 3. Listeners
    chatInput.addEventListener('input', () => {
        charCount.textContent = `${chatInput.value.length}/500`;
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = chatInput.value.trim();
        if (!content) return;

        await sendMessage(content);
    });

    async function initChat() {
        const { data: { session } } = await sbClient.auth.getSession();
        if (session) {
            currentUser = session.user;
        }
        await loadMessages();
        checkCooldown();
    }

    async function loadMessages() {
        try {
            const { data: messages, error } = await sbClient
                .from('world_chat_today')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            renderMessages(messages);
            scrollToBottom();
        } catch (err) {
            console.error('Error loading chat:', err);
        }
    }

    function renderMessages(messages) {
        if (!messages || messages.length === 0) {
            chatContainer.innerHTML = '<p class="empty-msg" style="text-align:center;">No hay mensajes hoy. ¡Sé el primero en escribir!</p>';
            return;
        }

        chatContainer.innerHTML = messages.map(msg => {
            const isOwn = currentUser && msg.user_id === currentUser.id;
            const avatar = fixGitHubImageUrl(msg.avatar_url);
            const authorName = msg.full_name || msg.username || 'Usuario';

            let gameCardHtml = '';
            if (msg.is_game_share && msg.game_id) {
                gameCardHtml = `
                    <div class="game-share-card" onclick="location.href='juego.html?id=${msg.game_id}'">
                        <img src="${fixGitHubImageUrl(msg.game_image)}" class="share-thumb">
                        <div class="share-info">
                            <span class="share-label">Recomendación</span>
                            <span class="share-title">${escapeHTML(msg.game_title)}</span>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="message-item ${isOwn ? 'own-message' : ''}">
                    <div class="msg-avatar" onclick="location.href='perfil.html?id=${msg.user_id}'">
                        ${avatar ? `<img src="${avatar}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=avatar-fallback>${escapeHTML(authorName[0])}</div>'">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--gold);color:black;font-weight:700;">${escapeHTML(authorName[0])}</div>`}
                    </div>
                    <div class="msg-bubble">
                        <div class="msg-header">
                            <span class="msg-author" onclick="location.href='perfil.html?id=${msg.user_id}'">${escapeHTML(authorName)}</span>
                            <span class="msg-time">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div class="msg-text">${escapeHTML(msg.content)}</div>
                        ${gameCardHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function sendMessage(content) {
        if (!currentUser) {
            showToast('Notificación', 'Inicia sesión para participar en el Mundo.');
            window.location.href = 'cuenta.html';
            return;
        }

        const sendBtn = document.getElementById('send-btn');
        sendBtn.disabled = true;

        try {
            const { error } = await sbClient
                .from('world_chat')
                .insert([{
                    user_id: currentUser.id,
                    content: content
                }]);

            if (error) {
                if (error.message.includes('world_chat')) {
                    showToast('Notificación', 'Debes esperar 15 minutos entre mensajes.');
                } else {
                    showToast('Notificación', 'Error: ' + error.message);
                }
            } else {
                chatInput.value = '';
                charCount.textContent = '0/500';
                await loadMessages();
                checkCooldown();
            }
        } catch (err) {
            console.error(err);
        } finally {
            sendBtn.disabled = false;
        }
    }

    async function checkCooldown() {
        if (!currentUser) return;

        const { data: lastMsg } = await sbClient
            .from('world_chat')
            .select('created_at')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastMsg) {
            const lastTime = new Date(lastMsg.created_at).getTime();
            const now = Date.now();
            const diff = now - lastTime;
            const cooldown = 15 * 60 * 1000;

            if (diff < cooldown) {
                startCooldownTimer(cooldown - diff);
            }
        }
    }

    function startCooldownTimer(ms) {
        cooldownBox.classList.remove('hidden');
        const updateTimer = () => {
            if (ms <= 0) {
                cooldownBox.classList.add('hidden');
                return;
            }
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            cooldownTimer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            ms -= 1000;
            setTimeout(updateTimer, 1000);
        };
        updateTimer();
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});
