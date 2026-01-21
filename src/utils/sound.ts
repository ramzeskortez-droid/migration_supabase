
// Используем ваш файл из корня: /audio-editor-output.mp3
// Используем Web Audio API для управления громкостью.

let audioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let lastPlayTime = 0;
let isFetching = false;

// Функция для инициализации контекста по клику пользователя
export const initAudioContext = () => {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
};

/**
 * Проигрывает звук уведомления с ограничением частоты (1 раз в 10 секунд).
 * @param volumeMultiplier Множитель громкости (0.75 = тише оригинала)
 */
export const playNotificationSound = async (volumeMultiplier: number = 0.75) => {
  const now = Date.now();
  
  // 1. ЖЕСТКИЙ ТРОТТЛИНГ
  if (now - lastPlayTime < 10000) return; 
  lastPlayTime = now;

  try {
    // Пытаемся инициализировать, если еще нет (но без жеста может не сработать)
    if (!audioCtx) initAudioContext();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        // Попытка возобновить (может упасть, если нет жеста, игнорируем)
        audioCtx.resume().catch(() => {});
    }

    // Если контекст все еще suspended, мы не можем играть звук
    if (audioCtx.state === 'suspended') return;

    if (!audioBuffer) {
        if (isFetching) return;
        isFetching = true;
        try {
            const response = await fetch('/audio-editor-output.mp3');
            if (!response.ok) throw new Error('Sound 404');
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        } finally {
            isFetching = false;
        }
    }

    if (!audioBuffer) return;

    const ctx = audioCtx;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volumeMultiplier; 

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);

    source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
    };

  } catch (e) {
    // Silent fail
  }
};
