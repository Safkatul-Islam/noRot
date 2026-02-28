import { AUDIO_TAGS, stripEmotionTags } from '@norot/shared';
/**
 * Returns the text for TTS.
 * The API may include leading direction tags (e.g., "[concerned] What's making it hard to start?"),
 * so we strip those before sending to the TTS provider.
 */
export function getScript(response) {
    return stripEmotionTags(response.recommendation.text);
}
/**
 * Returns the audio tag for a given severity level.
 * e.g., severity 3 -> "[concerned]"
 */
export function getAudioTag(severity) {
    return AUDIO_TAGS[severity];
}
