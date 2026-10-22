// Wesh Star IA — local Piper voice catalog. Every entry maps to a real local ONNX model.
// Models are downloaded once by local-tts/install-models.sh and then synthesized locally.
export const VOICE_CATALOG = [
  { id: "aria", label: "Aria", desc: "Local fr voice profile", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-siwis-medium.onnx", quality: "medium" },
  { id: "sarah", label: "Sarah", desc: "Local fr voice profile", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-tom-medium.onnx", quality: "medium" },
  { id: "charlotte", label: "Charlotte", desc: "Local fr voice profile", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-mls-medium.onnx", quality: "medium" },
  { id: "alice", label: "Alice", desc: "Local fr voice profile", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-upmc-medium.onnx", quality: "medium" },
  { id: "lisa", label: "Lisa", desc: "Local fr voice profile", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-gilles-low.onnx", quality: "low" },
  { id: "roger", label: "Roger", desc: "Local en voice profile", language: "en", locale: "en_US", ttsModel: "en_US-lessac-medium.onnx", quality: "medium" },
  { id: "george", label: "George", desc: "Local en voice profile", language: "en", locale: "en_US", ttsModel: "en_US-john-medium.onnx", quality: "medium" },
  { id: "liam", label: "Liam", desc: "Local en voice profile", language: "en", locale: "en_US", ttsModel: "en_US-ryan-medium.onnx", quality: "medium" },
  { id: "jonas", label: "Jonas", desc: "Local de voice profile", language: "de", locale: "de_DE", ttsModel: "de_DE-thorsten-medium.onnx", quality: "medium" },
  { id: "tom", label: "Tom", desc: "Local de voice profile", language: "de", locale: "de_DE", ttsModel: "de_DE-thorsten-high.onnx", quality: "high" },
  { id: "nini", label: "Nini", desc: "Local fr voice profile", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-siwis-medium.onnx", quality: "medium" },
  { id: "felix", label: "Felix", desc: "Local de voice profile", language: "de", locale: "de_DE", ttsModel: "de_DE-karlsson-low.onnx", quality: "low" },
  { id: "erich", label: "Erich", desc: "Local de voice profile", language: "de", locale: "de_DE", ttsModel: "de_DE-thorsten_emotional-medium.onnx", quality: "medium" },
  { id: "grete", label: "Grete", desc: "Local de voice profile", language: "de", locale: "de_DE", ttsModel: "de_DE-kerstin-low.onnx", quality: "low" },
  { id: "river", label: "River", desc: "Local en voice profile", language: "en", locale: "en_US", ttsModel: "en_US-sam-medium.onnx", quality: "medium" },
  { id: "sam", label: "Sam", desc: "Local en voice profile", language: "en", locale: "en_US", ttsModel: "en_US-sam-medium.onnx", quality: "medium" },
  { id: "fr_fr_siwis_medium", label: "Siwis", desc: "female-style French, clear", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-siwis-medium.onnx", quality: "medium" },
  { id: "fr_fr_gilles_low", label: "Gilles", desc: "male-style French, compact", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-gilles-low.onnx", quality: "low" },
  { id: "fr_fr_mls_medium", label: "MLS French", desc: "French multi-speaker corpus voice", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-mls-medium.onnx", quality: "medium" },
  { id: "fr_fr_mls_1840_low", label: "MLS 1840", desc: "French corpus voice", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-mls_1840-low.onnx", quality: "low" },
  { id: "fr_fr_tom_medium", label: "Tom", desc: "male-style French, natural", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-tom-medium.onnx", quality: "medium" },
  { id: "fr_fr_upmc_medium", label: "UPMC", desc: "French academic corpus voice", language: "fr", locale: "fr_FR", ttsModel: "fr_FR-upmc-medium.onnx", quality: "medium" },
  { id: "de_de_thorsten_medium", label: "Thorsten", desc: "male German, natural", language: "de", locale: "de_DE", ttsModel: "de_DE-thorsten-medium.onnx", quality: "medium" },
  { id: "de_de_thorsten_high", label: "Thorsten HD", desc: "male German, higher quality", language: "de", locale: "de_DE", ttsModel: "de_DE-thorsten-high.onnx", quality: "high" },
  { id: "de_de_eva_k_x_low", label: "Eva K", desc: "female German, lightweight", language: "de", locale: "de_DE", ttsModel: "de_DE-eva_k-x_low.onnx", quality: "x_low" },
  { id: "de_de_karlsson_low", label: "Karlsson", desc: "German, lightweight", language: "de", locale: "de_DE", ttsModel: "de_DE-karlsson-low.onnx", quality: "low" },
  { id: "de_de_kerstin_low", label: "Kerstin", desc: "female German, lightweight", language: "de", locale: "de_DE", ttsModel: "de_DE-kerstin-low.onnx", quality: "low" },
  { id: "de_de_mls_medium", label: "MLS German", desc: "German multi-speaker corpus", language: "de", locale: "de_DE", ttsModel: "de_DE-mls-medium.onnx", quality: "medium" },
  { id: "de_de_pavoque_low", label: "Pavoque", desc: "German, lightweight", language: "de", locale: "de_DE", ttsModel: "de_DE-pavoque-low.onnx", quality: "low" },
  { id: "de_de_ramona_low", label: "Ramona", desc: "female German, lightweight", language: "de", locale: "de_DE", ttsModel: "de_DE-ramona-low.onnx", quality: "low" },
  { id: "de_de_thorsten_emotional_medium", label: "Thorsten Emotional", desc: "German expressive model", language: "de", locale: "de_DE", ttsModel: "de_DE-thorsten_emotional-medium.onnx", quality: "medium" },
  { id: "en_gb_alan_medium", label: "Alan", desc: "British English male-style", language: "en", locale: "en_GB", ttsModel: "en_GB-alan-medium.onnx", quality: "medium" },
  { id: "en_gb_alba_medium", label: "Alba", desc: "British English female-style", language: "en", locale: "en_GB", ttsModel: "en_GB-alba-medium.onnx", quality: "medium" },
  { id: "en_gb_aru_medium", label: "Aru", desc: "British English", language: "en", locale: "en_GB", ttsModel: "en_GB-aru-medium.onnx", quality: "medium" },
  { id: "en_gb_cori_medium", label: "Cori", desc: "British English female-style", language: "en", locale: "en_GB", ttsModel: "en_GB-cori-medium.onnx", quality: "medium" },
  { id: "en_gb_cori_high", label: "Cori HD", desc: "British English female-style, higher quality", language: "en", locale: "en_GB", ttsModel: "en_GB-cori-high.onnx", quality: "high" },
  { id: "en_gb_jenny_dioco_medium", label: "Jenny Dioco", desc: "British English female-style", language: "en", locale: "en_GB", ttsModel: "en_GB-jenny_dioco-medium.onnx", quality: "medium" },
  { id: "en_gb_northern_english_male_medium", label: "Northern English Male", desc: "Northern British English male-style", language: "en", locale: "en_GB", ttsModel: "en_GB-northern_english_male-medium.onnx", quality: "medium" },
  { id: "en_gb_semaine_medium", label: "Semaine", desc: "British English", language: "en", locale: "en_GB", ttsModel: "en_GB-semaine-medium.onnx", quality: "medium" },
  { id: "en_us_amy_medium", label: "Amy", desc: "US English female-style", language: "en", locale: "en_US", ttsModel: "en_US-amy-medium.onnx", quality: "medium" },
  { id: "en_us_arctic_medium", label: "Arctic", desc: "US English", language: "en", locale: "en_US", ttsModel: "en_US-arctic-medium.onnx", quality: "medium" },
  { id: "en_us_bryce_medium", label: "Bryce", desc: "US English male-style", language: "en", locale: "en_US", ttsModel: "en_US-bryce-medium.onnx", quality: "medium" },
  { id: "en_us_danny_low", label: "Danny", desc: "US English, lightweight", language: "en", locale: "en_US", ttsModel: "en_US-danny-low.onnx", quality: "low" },
  { id: "en_us_hfc_female_medium", label: "HFC Female", desc: "US English female-style", language: "en", locale: "en_US", ttsModel: "en_US-hfc_female-medium.onnx", quality: "medium" },
  { id: "en_us_hfc_male_medium", label: "HFC Male", desc: "US English male-style", language: "en", locale: "en_US", ttsModel: "en_US-hfc_male-medium.onnx", quality: "medium" },
  { id: "en_us_joe_medium", label: "Joe", desc: "US English male-style", language: "en", locale: "en_US", ttsModel: "en_US-joe-medium.onnx", quality: "medium" },
  { id: "en_us_john_medium", label: "John", desc: "US English male-style", language: "en", locale: "en_US", ttsModel: "en_US-john-medium.onnx", quality: "medium" },
  { id: "en_us_kathleen_low", label: "Kathleen", desc: "US English female-style, lightweight", language: "en", locale: "en_US", ttsModel: "en_US-kathleen-low.onnx", quality: "low" },
  { id: "en_us_kristin_medium", label: "Kristin", desc: "US English female-style", language: "en", locale: "en_US", ttsModel: "en_US-kristin-medium.onnx", quality: "medium" },
  { id: "en_us_kusal_medium", label: "Kusal", desc: "US English", language: "en", locale: "en_US", ttsModel: "en_US-kusal-medium.onnx", quality: "medium" },
  { id: "en_us_l2arctic_medium", label: "L2 Arctic", desc: "US English", language: "en", locale: "en_US", ttsModel: "en_US-l2arctic-medium.onnx", quality: "medium" },
  { id: "en_us_lessac_medium", label: "Lessac", desc: "US English female-style", language: "en", locale: "en_US", ttsModel: "en_US-lessac-medium.onnx", quality: "medium" },
  { id: "en_us_lessac_high", label: "Lessac HD", desc: "US English female-style, higher quality", language: "en", locale: "en_US", ttsModel: "en_US-lessac-high.onnx", quality: "high" },
  { id: "en_us_libritts_high", label: "LibriTTS", desc: "US English multi-speaker corpus", language: "en", locale: "en_US", ttsModel: "en_US-libritts-high.onnx", quality: "high" },
  { id: "en_us_libritts_r_medium", label: "LibriTTS-R", desc: "US English multi-speaker corpus", language: "en", locale: "en_US", ttsModel: "en_US-libritts_r-medium.onnx", quality: "medium" },
  { id: "en_us_ljspeech_medium", label: "LJ Speech", desc: "US English female-style", language: "en", locale: "en_US", ttsModel: "en_US-ljspeech-medium.onnx", quality: "medium" },
  { id: "en_us_norman_medium", label: "Norman", desc: "US English male-style", language: "en", locale: "en_US", ttsModel: "en_US-norman-medium.onnx", quality: "medium" },
  { id: "en_us_ryan_medium", label: "Ryan", desc: "US English male-style", language: "en", locale: "en_US", ttsModel: "en_US-ryan-medium.onnx", quality: "medium" },
  { id: "en_us_ryan_high", label: "Ryan HD", desc: "US English male-style, higher quality", language: "en", locale: "en_US", ttsModel: "en_US-ryan-high.onnx", quality: "high" },
  { id: "en_us_sam_medium", label: "Sam", desc: "US English", language: "en", locale: "en_US", ttsModel: "en_US-sam-medium.onnx", quality: "medium" },
  { id: "es_ar_daniela_high", label: "Daniela", desc: "Spanish es_AR voice", language: "es", locale: "es_AR", ttsModel: "es_AR-daniela-high.onnx", quality: "high" },
  { id: "es_es_carlfm_x_low", label: "CarlFM", desc: "Spanish es_ES voice", language: "es", locale: "es_ES", ttsModel: "es_ES-carlfm-x_low.onnx", quality: "x_low" },
  { id: "es_es_davefx_medium", label: "DaveFX", desc: "Spanish es_ES voice", language: "es", locale: "es_ES", ttsModel: "es_ES-davefx-medium.onnx", quality: "medium" },
  { id: "es_es_mls_10246_low", label: "MLS 10246", desc: "Spanish es_ES voice", language: "es", locale: "es_ES", ttsModel: "es_ES-mls_10246-low.onnx", quality: "low" },
  { id: "es_es_mls_9972_low", label: "MLS 9972", desc: "Spanish es_ES voice", language: "es", locale: "es_ES", ttsModel: "es_ES-mls_9972-low.onnx", quality: "low" },
  { id: "es_es_sharvard_medium", label: "Sharvard", desc: "Spanish es_ES voice", language: "es", locale: "es_ES", ttsModel: "es_ES-sharvard-medium.onnx", quality: "medium" },
  { id: "es_mx_ald_medium", label: "Ald", desc: "Spanish es_MX voice", language: "es", locale: "es_MX", ttsModel: "es_MX-ald-medium.onnx", quality: "medium" },
  { id: "es_mx_claude_high", label: "Claude", desc: "Spanish es_MX voice", language: "es", locale: "es_MX", ttsModel: "es_MX-claude-high.onnx", quality: "high" },
  { id: "it_it_paola_medium", label: "Paola", desc: "Italian voice", language: "it", locale: "it_IT", ttsModel: "it_IT-paola-medium.onnx", quality: "medium" },
  { id: "it_it_riccardo_x_low", label: "Riccardo", desc: "Italian voice", language: "it", locale: "it_IT", ttsModel: "it_IT-riccardo-x_low.onnx", quality: "x_low" },
  { id: "pt_br_cadu_medium", label: "Cadu", desc: "Portuguese voice", language: "pt", locale: "pt_BR", ttsModel: "pt_BR-cadu-medium.onnx", quality: "medium" },
  { id: "pt_br_edresson_low", label: "Edresson", desc: "Portuguese voice", language: "pt", locale: "pt_BR", ttsModel: "pt_BR-edresson-low.onnx", quality: "low" },
  { id: "pt_br_faber_medium", label: "Faber", desc: "Portuguese voice", language: "pt", locale: "pt_BR", ttsModel: "pt_BR-faber-medium.onnx", quality: "medium" },
  { id: "pt_br_jeff_medium", label: "Jeff", desc: "Portuguese voice", language: "pt", locale: "pt_BR", ttsModel: "pt_BR-jeff-medium.onnx", quality: "medium" },
  { id: "pt_pt_tugao_medium", label: "Tugão", desc: "Portuguese voice", language: "pt", locale: "pt_PT", ttsModel: "pt_PT-tugao-medium.onnx", quality: "medium" },
  { id: "nl_be_nathalie_medium", label: "Nathalie", desc: "Dutch voice", language: "nl", locale: "nl_BE", ttsModel: "nl_BE-nathalie-medium.onnx", quality: "medium" },
  { id: "nl_be_rdh_medium", label: "RDH", desc: "Dutch voice", language: "nl", locale: "nl_BE", ttsModel: "nl_BE-rdh-medium.onnx", quality: "medium" },
  { id: "nl_nl_mls_medium", label: "MLS Dutch", desc: "Dutch voice", language: "nl", locale: "nl_NL", ttsModel: "nl_NL-mls-medium.onnx", quality: "medium" },
  { id: "nl_nl_mls_5809_low", label: "MLS 5809", desc: "Dutch voice", language: "nl", locale: "nl_NL", ttsModel: "nl_NL-mls_5809-low.onnx", quality: "low" },
  { id: "nl_nl_pim_medium", label: "Pim", desc: "Dutch voice", language: "nl", locale: "nl_NL", ttsModel: "nl_NL-pim-medium.onnx", quality: "medium" },
  { id: "nl_nl_ronnie_medium", label: "Ronnie", desc: "Dutch voice", language: "nl", locale: "nl_NL", ttsModel: "nl_NL-ronnie-medium.onnx", quality: "medium" },
  { id: "pl_pl_darkman_medium", label: "Darkman", desc: "Polish voice", language: "pl", locale: "pl_PL", ttsModel: "pl_PL-darkman-medium.onnx", quality: "medium" },
  { id: "pl_pl_gosia_medium", label: "Gosia", desc: "Polish voice", language: "pl", locale: "pl_PL", ttsModel: "pl_PL-gosia-medium.onnx", quality: "medium" },
  { id: "pl_pl_mc_speech_medium", label: "MC Speech", desc: "Polish voice", language: "pl", locale: "pl_PL", ttsModel: "pl_PL-mc_speech-medium.onnx", quality: "medium" },
  { id: "pl_pl_mls_6892_low", label: "MLS 6892", desc: "Polish voice", language: "pl", locale: "pl_PL", ttsModel: "pl_PL-mls_6892-low.onnx", quality: "low" },
  { id: "ru_ru_denis_medium", label: "Denis", desc: "Russian voice", language: "ru", locale: "ru_RU", ttsModel: "ru_RU-denis-medium.onnx", quality: "medium" },
  { id: "ru_ru_dmitri_medium", label: "Dmitri", desc: "Russian voice", language: "ru", locale: "ru_RU", ttsModel: "ru_RU-dmitri-medium.onnx", quality: "medium" },
  { id: "ru_ru_irina_medium", label: "Irina", desc: "Russian voice", language: "ru", locale: "ru_RU", ttsModel: "ru_RU-irina-medium.onnx", quality: "medium" },
  { id: "ru_ru_ruslan_medium", label: "Ruslan", desc: "Russian voice", language: "ru", locale: "ru_RU", ttsModel: "ru_RU-ruslan-medium.onnx", quality: "medium" },
  { id: "ar_jo_kareem_medium", label: "Kareem", desc: "ar local voice", language: "ar", locale: "ar_JO", ttsModel: "ar_JO-kareem-medium.onnx", quality: "medium" },
  { id: "hi_in_pratham_medium", label: "Pratham", desc: "hi local voice", language: "hi", locale: "hi_IN", ttsModel: "hi_IN-pratham-medium.onnx", quality: "medium" },
  { id: "hi_in_priyamvada_medium", label: "Priyamvada", desc: "hi local voice", language: "hi", locale: "hi_IN", ttsModel: "hi_IN-priyamvada-medium.onnx", quality: "medium" },
  { id: "tr_tr_dfki_medium", label: "DFKI", desc: "tr local voice", language: "tr", locale: "tr_TR", ttsModel: "tr_TR-dfki-medium.onnx", quality: "medium" },
  { id: "zh_cn_huayan_medium", label: "Huayan", desc: "zh local voice", language: "zh", locale: "zh_CN", ttsModel: "zh_CN-huayan-medium.onnx", quality: "medium" },
  { id: "sw_cd_lanfrica_medium", label: "Lanfrica", desc: "sw local voice", language: "sw", locale: "sw_CD", ttsModel: "sw_CD-lanfrica-medium.onnx", quality: "medium" },
  { id: "vi_vn_25hours_single_low", label: "25Hours", desc: "vi local voice", language: "vi", locale: "vi_VN", ttsModel: "vi_VN-25hours_single-low.onnx", quality: "low" },
  { id: "vi_vn_vais1000_medium", label: "VAIS1000", desc: "vi local voice", language: "vi", locale: "vi_VN", ttsModel: "vi_VN-vais1000-medium.onnx", quality: "medium" },
  { id: "vi_vn_vivos_x_low", label: "VIVOS", desc: "vi local voice", language: "vi", locale: "vi_VN", ttsModel: "vi_VN-vivos-x_low.onnx", quality: "x_low" },
] as const;

export type VoiceId = typeof VOICE_CATALOG[number]["id"];
const BY_ID = new Map(VOICE_CATALOG.map((v) => [v.id, v]));

export function voiceIdAt(index: number): VoiceId {
  return VOICE_CATALOG[((index % VOICE_CATALOG.length) + VOICE_CATALOG.length) % VOICE_CATALOG.length].id;
}

export function voiceDesc(id: string | undefined | null, fallbackIndex = 0): string {
  const v = id ? BY_ID.get(id as VoiceId) : undefined;
  if (v) return v.desc;
  return VOICE_CATALOG[((fallbackIndex % VOICE_CATALOG.length) + VOICE_CATALOG.length) % VOICE_CATALOG.length].desc;
}

export function isValidVoiceId(id: unknown): id is VoiceId {
  return typeof id === "string" && BY_ID.has(id as VoiceId);
}

export function voicesForLanguage(language: string) {
  return VOICE_CATALOG.filter((v) => v.language === language || v.locale === language);
}
