// Messages lisibles pour les codes d'erreur des API créateur.
export const ERR: Record<string, string> = {
  AUTH_REQUIRED: "Connecte-toi d'abord.", ACCOUNT_BLOCKED: "Compte bloqué.", RATE_LIMIT: "Trop de requêtes, réessaie dans une minute.",
  INSUFFICIENT_TOKENS: "Pas assez de crédits vidéo.", INSUFFICIENT_COINS: "Pas assez de pièces. Achète des pièces ou utilise tes gains créateur.", GIFTS_DISABLED: "Les cadeaux sont désactivés.", GIFT_UNAVAILABLE: "Ce cadeau n'est plus disponible.",
  SELF_GIFT: "Tu ne peux pas t'offrir un cadeau.", NOT_FOUND: "Introuvable ou plus accessible.", COMMUNITY_DISABLED: "La communauté est désactivée.",
  EFFECT_LOCKED: "Effet payant : débloque-le d'abord.", EFFECT_UNAVAILABLE: "Effet indisponible.", RIGHTS_REQUIRED: "Confirme que tu as les droits sur cette musique.",
  INVALID_AUDIO: "Fichier audio invalide.", INVALID_VIDEO: "Fichier vidéo invalide.", VIDEO_TOO_LARGE: "Vidéo trop lourde (200 Mo max).", VIDEO_TOO_LONG: "Vidéo trop longue (10 min max).",
  SOUND_UNAVAILABLE: "Ce son n'est plus disponible.", SOUNDS_DISABLED: "Les sons partagés sont désactivés.", AUTO_EDIT_DISABLED: "Le montage automatique est désactivé.",
  JOB_ALREADY_RUNNING: "Un montage est déjà en cours.", SERVER_BUSY: "Serveur occupé, réessaie dans un instant.", CLIP_COUNT: "Nombre de vidéos invalide.",
  LIVE_BLOCKED: "Tu as été bloqué dans ce LIVE.", LIVE_DISABLED: "Le LIVE est désactivé.", GUEST_STAGE_DISABLED: "L’hôte n’a pas activé les invités.", GUEST_STAGE_FULL: "La scène a atteint sa capacité maximale.", HOST_CANNOT_REQUEST: "L’hôte ne peut pas demander à monter sur sa propre scène.", REQUEST_NOT_FOUND: "Demande d’invitation introuvable.", LIVE_ENDED: "Ce LIVE est terminé.", ALREADY_LIVE: "Tu as déjà un LIVE en cours.", CHESTS_DISABLED: "Les coffres sont désactivés.",
  NOT_IN_LIVE: "Rejoins le LIVE d'abord.", TOO_MANY_CHESTS: "Trop de coffres ouverts dans ce LIVE.", INVALID_AMOUNT: "Montant ou nombre de participants invalide.",
  CHEST_CLOSED: "Ce coffre est fermé.", CHEST_EMPTY: "Coffre vide : toutes les parts sont prises.", OWN_CHEST: "Tu ne peux pas réclamer ton propre coffre.",
  NOT_ELIGIBLE: "Pas encore éligible (présence ou ancienneté du compte insuffisante).", ALREADY_CLAIMED: "Tu as déjà pris ta part.", FORBIDDEN: "Action non autorisée.", SERVER_ERROR: "Erreur serveur.",
};
export const errText = (code?: string, fallback = "Erreur") => (code && ERR[code]) || fallback;
