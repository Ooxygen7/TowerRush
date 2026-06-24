startWaveBtn.onclick = spawnWave;
document.getElementById('restart-btn').onclick = () => {
    modal.style.display = 'none';
    selectedTowerPool = [];
    selectedMap = null;
    returnToSelectionScreen();
};

document.getElementById('replay-btn').onclick = () => {
    modal.style.display = 'none';
    if (isReplayMode) {
        returnToSelectionScreen();
        return;
    }
    resetGame();
};

const confirmModal = document.getElementById('confirm-modal');
quickRestartButton.addEventListener('click', () => {
    if (isTestMode || isReplayMode) return;
    confirmModal.style.display = 'flex';
});
document.getElementById('confirm-restart-no').addEventListener('click', () => {
    confirmModal.style.display = 'none';
});
document.getElementById('confirm-restart-yes').addEventListener('click', () => {
    if (isTestMode || isReplayMode) return;
    confirmModal.style.display = 'none';
    resetGame();
});
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) confirmModal.style.display = 'none';
});

const abandonConfirmModal = document.getElementById('abandon-confirm-modal');
abandonButton.addEventListener('click', () => {
    if (isTestMode || isReplayMode || gameEnded) return;
    abandonConfirmModal.style.display = 'flex';
});
document.getElementById('confirm-abandon-no').addEventListener('click', () => {
    abandonConfirmModal.style.display = 'none';
});
document.getElementById('confirm-abandon-yes').addEventListener('click', () => {
    abandonConfirmModal.style.display = 'none';
    returnToSelectionScreen();
});
abandonConfirmModal.addEventListener('click', event => {
    if (event.target === abandonConfirmModal) abandonConfirmModal.style.display = 'none';
});

window.addEventListener('beforeunload', event => {
    event.preventDefault();
    event.returnValue = '';
});

const ANNOUNCE_VERSION = '2026-06-22.5';
const announcementModal = document.getElementById('announcement-modal');
function openAnnouncement() { announcementModal.style.display = 'flex'; }
function closeAnnouncement() {
    announcementModal.style.display = 'none';
    const dont = document.getElementById('announce-dont-show');
    if (dont && dont.checked) { try { localStorage.setItem('tf_announce_seen', ANNOUNCE_VERSION); } catch (e) {} }
}
document.getElementById('announce-ok').addEventListener('click', closeAnnouncement);
document.getElementById('announce-close-x').addEventListener('click', closeAnnouncement);
announcementModal.addEventListener('click', (e) => { if (e.target === announcementModal) closeAnnouncement(); });
document.getElementById('open-announcement-btn').addEventListener('click', openAnnouncement);
function maybeShowAnnouncement() {
    let seen = null;
    try { seen = localStorage.getItem('tf_announce_seen'); } catch (e) {}
    if (seen !== ANNOUNCE_VERSION) openAnnouncement();
}
