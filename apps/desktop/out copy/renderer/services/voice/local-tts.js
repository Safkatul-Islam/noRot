export class LocalTTS {
    voicesLoaded = false;
    speaking = false;
    constructor() {
        if ('speechSynthesis' in window) {
            // Voices load asynchronously in Chromium
            if (speechSynthesis.getVoices().length > 0) {
                this.voicesLoaded = true;
            }
            else {
                speechSynthesis.addEventListener('voiceschanged', () => {
                    this.voicesLoaded = true;
                }, { once: true });
            }
        }
    }
    isAvailable() {
        return 'speechSynthesis' in window;
    }
    speak(text, onBoundary) {
        return new Promise((resolve, reject) => {
            if (!this.isAvailable()) {
                reject(new Error('SpeechSynthesis not available'));
                return;
            }
            // Cancel any ongoing speech
            this.speaking = false;
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            // Pick a good English voice if available
            const voices = speechSynthesis.getVoices();
            const preferred = voices.find((v) => v.lang.startsWith('en') && v.localService);
            if (preferred)
                utterance.voice = preferred;
            if (onBoundary) {
                utterance.onboundary = () => onBoundary();
            }
            utterance.onend = () => {
                this.speaking = false;
                resolve();
            };
            utterance.onerror = (e) => {
                this.speaking = false;
                if (e.error === 'canceled') {
                    resolve(); // Treat cancel as success
                }
                else {
                    reject(new Error(`SpeechSynthesis error: ${e.error}`));
                }
            };
            this.speaking = true;
            speechSynthesis.speak(utterance);
        });
    }
    isSpeaking() {
        return this.isAvailable() && (this.speaking || speechSynthesis.speaking);
    }
    stop() {
        if (this.isAvailable()) {
            this.speaking = false;
            speechSynthesis.cancel();
        }
    }
}
