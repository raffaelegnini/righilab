"use client";
import styles from "./page.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, startTransition } from "react";
import Button from "@/components/Button";
import { useLesson } from "@/components/LessonProvider";
import { GENERATION_TOOLTIPS } from "@/utils/constants";

const MAX_FILES = 3;
const MAX_VIDEOS = 1;
const MAX_TOPICS = 3;

function extractYouTubeVideoId(value) {
  try {
    const parsedUrl = new URL(value);
    const host = parsedUrl.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v");
      }

      if (parsedUrl.pathname.startsWith("/shorts/") || parsedUrl.pathname.startsWith("/embed/")) {
        return parsedUrl.pathname.split("/").filter(Boolean)[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export default function Upload() {
  const router = useRouter();
  const { setLesson } = useLesson();
  const [currentStep, setCurrentStep] = useState(1);
  const [phase, setPhase] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [uploadedTopics, setUploadedTopics] = useState([]);
  const [submittedValue, setSubmittedValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tooltipIndex, setTooltipIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [generationComplete, setGenerationComplete] = useState(false);

  const steps = [
    "Step 1: Scegli metodo",
    "Step 2: Carica",
    "Step 3: Genera",
  ];
  const stepGap = 100 / (steps.length + 1);
  const stepPercents = steps.map((_, index) => stepGap * (index + 1));

  useEffect(() => {
    if (!isGenerating) {
      return undefined;
    }

    let timeoutId;
    const cycleTooltip = () => {
      setTooltipIndex((previousIndex) => {
        const randomOffset = Math.floor(Math.random() * (GENERATION_TOOLTIPS.length - 1)) + 1;
        return (previousIndex + randomOffset) % GENERATION_TOOLTIPS.length;
      });
      const nextDelay = 3000 + Math.floor(Math.random() * 2001);
      timeoutId = window.setTimeout(cycleTooltip, nextDelay);
    };

    const initialDelay = 3000 + Math.floor(Math.random() * 2001);
    timeoutId = window.setTimeout(cycleTooltip, initialDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating || !generationComplete) {
      return undefined;
    }

    const redirectTimeoutId = window.setTimeout(() => {
      startTransition(() => {
        router.push("/lezione");
      });
    }, 1500);

    return () => {
      window.clearTimeout(redirectTimeoutId);
    };
  }, [isGenerating, generationComplete, router]);

  const handleCardClick = (method) => {
    setSelectedMethod(method);
    setPhase(2);
    setCurrentStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedMethod === "notes" && uploadedFiles.length === 0) {
      setUploadError("Carica o trascina un file prima di continuare.");
      return;
    }
    if (selectedMethod === "video" && uploadedVideos.length === 0) {
      setUploadError("Aggiungi un link YouTube prima di continuare.");
      return;
    }
    if (selectedMethod === "topic" && uploadedTopics.length === 0) {
      setUploadError("Aggiungi almeno un argomento prima di continuare.");
      return;
    }
    setUploadError("");
    setSubmittedValue(
      selectedMethod === "notes"
        ? uploadedFiles.map((file) => file.name)
        : selectedMethod === "video"
          ? uploadedVideos
          : selectedMethod === "topic"
            ? uploadedTopics
            : inputValue,
    );
    setPhase(3);
    setCurrentStep(3);
  };

  const handleBack = () => {
    setGenerationError("");
    if (phase > 1) {
      setPhase((previousPhase) => previousPhase - 1);
      setCurrentStep((previousStep) => previousStep - 1);
      if (phase === 2) {
        setSelectedMethod(null);
        setInputValue("");
        setUploadedFiles([]);
        setUploadedVideos([]);
        setUploadedTopics([]);
        setSubmittedValue("");
      }
    }
  };

  const addFiles = (files) => {
    if (!files.length) return;

    setUploadedFiles((previousFiles) => {
      if (previousFiles.length >= MAX_FILES) return previousFiles;

      const nextFiles = [...previousFiles];
      for (const file of files) {
        if (nextFiles.length >= MAX_FILES) break;
        const alreadyAdded = nextFiles.some(
          (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified,
        );
        if (!alreadyAdded) nextFiles.push(file);
      }
      return nextFiles;
    });
    setUploadError("");
  };

  const handleRemoveFile = (fileToRemove) => {
    setUploadedFiles((previousFiles) => previousFiles.filter(
      (file) => !(file.name === fileToRemove.name && file.size === fileToRemove.size && file.lastModified === fileToRemove.lastModified),
    ));
  };

  const handleAddVideo = () => {
    const normalizedValue = inputValue.trim();
    const videoId = extractYouTubeVideoId(normalizedValue);

    if (!normalizedValue) {
      setUploadError("Inserisci un link YouTube valido prima di aggiungerlo.");
      return;
    }

    if (!videoId) {
      setUploadError("Inserisci un link YouTube valido prima di aggiungerlo.");
      return;
    }

    if (uploadedVideos.length >= MAX_VIDEOS) {
      setUploadError(`Puoi aggiungere massimo ${MAX_VIDEOS} video.`);
      return;
    }

    setUploadedVideos((previousVideos) => (
      previousVideos.includes(normalizedValue)
        ? previousVideos
        : [...previousVideos, normalizedValue]
    ));
    setUploadError("");
    setInputValue("");
  };

  const handleRemoveVideo = (videoToRemove) => {
    setUploadedVideos((previousVideos) => previousVideos.filter((video) => video !== videoToRemove));
  };

  const handleAddTopic = () => {
    const normalizedValue = inputValue.trim();

    if (!normalizedValue) {
      setUploadError("Inserisci un argomento prima di aggiungerlo.");
      return;
    }

    if (uploadedTopics.length >= MAX_TOPICS) {
      setUploadError(`Puoi aggiungere massimo ${MAX_TOPICS} argomenti.`);
      return;
    }

    setUploadedTopics((previousTopics) => (
      previousTopics.includes(normalizedValue)
        ? previousTopics
        : [...previousTopics, normalizedValue]
    ));
    setUploadError("");
    setInputValue("");
  };

  const handleRemoveTopic = (topicToRemove) => {
    setUploadedTopics((previousTopics) => previousTopics.filter((topic) => topic !== topicToRemove));
  };

  const handleStartGeneration = async () => {
    const lessonItems =
      selectedMethod === "notes"
        ? uploadedFiles.map((file) => file.name)
        : selectedMethod === "video"
          ? uploadedVideos
          : selectedMethod === "topic"
            ? uploadedTopics
            : [];

    setTooltipIndex(Math.floor(Math.random() * GENERATION_TOOLTIPS.length));
    setIsGenerating(true);
    setGenerationComplete(false);
    setGenerationError("");

    try {
      let res;
      if (selectedMethod === "notes" && uploadedFiles.length > 0) {
        const formData = new FormData();
        formData.set("method", selectedMethod);
        formData.set("items", JSON.stringify(lessonItems));
        uploadedFiles.forEach((f) => formData.append("files", f));
        res = await fetch("/api/generate-lesson", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/generate-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: selectedMethod, items: lessonItems }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Errore ${res.status}. Riprova.`);
      }
      const lessonData = await res.json();
      startTransition(() => {
        setLesson(lessonData);
        setGenerationComplete(true);
      });
    } catch (err) {
      const msg = err?.message || "Errore nella generazione. Riprova.";
      setGenerationError(msg);
      setIsGenerating(false);
      setGenerationComplete(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploadedFiles.length >= MAX_FILES) return;
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (!droppedFiles.length) return;
    addFiles(droppedFiles);
  };

  if (isGenerating) {
    return (
      <main className={styles.main}>
        <section className={styles.generatingOnly}>
          <Image
            src="/Robot%20Mascotte%20Assets/4_VID_Caricamento_final.gif"
            alt="Robot che sta generando la lezione"
            width={520}
            height={520}
            className={styles.generatingImage}
            priority
            unoptimized
          />
          <p className={styles.generatingTooltip}>{GENERATION_TOOLTIPS[tooltipIndex]}</p>
        </section>
      </main>
    );
  }

  const selectedMethodTitle = METHODS.find((method) => method.id === selectedMethod)?.title;
  const pendingVideoId = extractYouTubeVideoId(inputValue.trim());

  return (
    <main className={styles.main}>
      <section className={styles.uploadSection}>
        <h2 className={styles.pageTitle}>Scegli come partire!</h2>

        <div className={styles.timeline}>
          <div className={styles.progressBar}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: `${stepPercents[0]}%` }}
              animate={{ width: `${stepPercents[currentStep - 1]}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </div>
          {steps.map((step, index) => (
            <div
              key={index}
              className={`${styles.step} ${index + 1 === currentStep ? styles.currentStep : ""}`}
              style={{ left: `${stepPercents[index]}%` }}
            >
              <div className={`${styles.dot} ${index < currentStep ? styles.active : ''}`}></div>
              <span>{step}</span>
            </div>
          ))}
        </div>
        {generationError && (
          <div className={styles.generationError} role="alert">
            <p>{generationError}</p>
          </div>
        )}
        <div className={styles.phaseViewport}>
          <AnimatePresence mode="wait">
            {phase === 1 && (
              <motion.div
                key="phase1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className={styles.cardsContainer}>
                  {METHODS.map((method, index) => (
                    <motion.button
                      key={method.id}
                      type="button"
                      className={styles.card}
                      onClick={() => handleCardClick(method.id)}
                      initial={{ opacity: 0, y: 28 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -6, scale: 1.01 }}
                      transition={{ duration: 0.3, delay: index * 0.07 }}
                    >
                      <Image
                        src={method.img}
                        alt={method.alt}
                        width={180}
                        height={140}
                        className={styles.cardImage}
                      />
                      <h3>{method.title}</h3>
                      <p>{method.description}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {phase === 2 && (
              <motion.div
                key="phase2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className={styles.uploadForm}
              >
                {selectedMethod === 'notes' && (
                  <form onSubmit={handleSubmit} className={styles.form}>
                    <h3>Carica i tuoi appunti</h3>
                    <p className={styles.formSubtitle}>Carica fino a {MAX_FILES} file (DOC, PDF, TXT) e poi conferma.</p>
                    <label
                      className={`${styles.uploadDropzone} ${isDragOver ? styles.dropzoneActive : ""} ${uploadedFiles.length >= MAX_FILES ? styles.dropzoneDisabled : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        multiple
                        disabled={uploadedFiles.length >= MAX_FILES}
                        className={styles.dropzoneInput}
                        onChange={(e) => {
                          addFiles(Array.from(e.target.files || []));
                          e.target.value = "";
                        }}
                      />
                      <span className={styles.dropzoneTitle}>Trascina qui i file</span>
                      <span className={styles.dropzoneHint}>oppure clicca per selezionarli dal dispositivo</span>
                    </label>
                    {uploadError ? <p className={styles.uploadError}>{uploadError}</p> : null}
                    {uploadedFiles.length > 0 ? (
                      <div className={styles.uploadedFiles}>
                        <span className={styles.countBadge}>{uploadedFiles.length}/{MAX_FILES} file</span>
                        {uploadedFiles.map((file) => (
                          <div
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className={styles.fileCard}
                          >
                            <span className={styles.fileName}>{file.name}</span>
                            <button
                              type="button"
                              className={styles.removeFileButton}
                              onClick={() => handleRemoveFile(file)}
                              aria-label={`Rimuovi ${file.name}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {uploadedFiles.length > 0 ? (
                      <Button type="submit" variant="solid">Conferma caricamento</Button>
                    ) : null}
                  </form>
                )}
                {selectedMethod === 'video' && (
                  <form onSubmit={handleSubmit} className={styles.form}>
                    <h3>Inserisci link YouTube</h3>
                    <p className={styles.formSubtitle}>Inserisci {MAX_VIDEOS} link YouTube e conferma.</p>
                    <div className={styles.videoInputGroup}>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className={styles.themedInput}
                        disabled={uploadedVideos.length >= MAX_VIDEOS}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddVideo}
                        disabled={uploadedVideos.length >= MAX_VIDEOS}
                      >
                        Aggiungi video
                      </Button>
                    </div>
                    {pendingVideoId && uploadedVideos.length === 0 ? (
                      <div className={styles.videoPreviewCard}>
                        <p className={styles.videoPreviewLabel}>Anteprima video</p>
                        <iframe
                          className={styles.videoPreviewFrame}
                          src={`https://www.youtube.com/embed/${pendingVideoId}`}
                          title="Anteprima YouTube"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    ) : null}
                    {uploadError ? <p className={styles.uploadError}>{uploadError}</p> : null}
                    {uploadedVideos.length > 0 ? (
                      <div className={styles.uploadedFiles}>
                        <span className={styles.countBadge}>{uploadedVideos.length}/{MAX_VIDEOS} video</span>
                        {uploadedVideos.map((video) => (
                          <div key={video} className={styles.videoCard}>
                            <iframe
                              className={styles.videoPreviewFrame}
                              src={`https://www.youtube.com/embed/${extractYouTubeVideoId(video)}`}
                              title={`Anteprima ${video}`}
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allowFullScreen
                            />
                            <div className={styles.videoMetaRow}>
                              <span className={styles.fileName}>{video}</span>
                              <button
                                type="button"
                                className={styles.removeFileButton}
                                onClick={() => handleRemoveVideo(video)}
                                aria-label={`Rimuovi ${video}`}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {uploadedVideos.length > 0 ? (
                      <Button type="submit" variant="solid">Conferma caricamento</Button>
                    ) : null}
                  </form>
                )}
                {selectedMethod === 'topic' && (
                  <form onSubmit={handleSubmit} className={styles.form}>
                    <h3>Scegli l&apos;argomento</h3>
                    <p className={styles.formSubtitle}>Aggiungi fino a {MAX_TOPICS} argomenti da studiare e conferma.</p>
                    <div className={styles.videoInputGroup}>
                      <input
                        type="text"
                        placeholder="Inserisci un argomento"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className={styles.themedInput}
                        disabled={uploadedTopics.length >= MAX_TOPICS}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddTopic}
                        disabled={uploadedTopics.length >= MAX_TOPICS}
                      >
                        Aggiungi argomento
                      </Button>
                    </div>
                    {uploadError ? <p className={styles.uploadError}>{uploadError}</p> : null}
                    {uploadedTopics.length > 0 ? (
                      <div className={styles.uploadedFiles}>
                        <span className={styles.countBadge}>{uploadedTopics.length}/{MAX_TOPICS} argomenti</span>
                        {uploadedTopics.map((topic) => (
                          <div key={topic} className={styles.fileCard}>
                            <span className={styles.fileName}>{topic}</span>
                            <button
                              type="button"
                              className={styles.removeFileButton}
                              onClick={() => handleRemoveTopic(topic)}
                              aria-label={`Rimuovi ${topic}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {uploadedTopics.length > 0 ? (
                      <Button type="submit" variant="solid">Conferma caricamento</Button>
                    ) : null}
                  </form>
                )}
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  className={styles.backButton}
                >
                  Indietro
                </Button>
              </motion.div>
            )}

            {phase === 3 && (
              <motion.div
                key="phase3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className={styles.final}
              >
                <h3>Conferma prima di generare</h3>
                <p className={styles.formSubtitle}>
                  Hai scelto <strong>{selectedMethodTitle}</strong>.
                </p>
                {Array.isArray(submittedValue) ? (
                  <div className={styles.confirmedFiles}>
                    <p className={styles.inputReminder}>
                      {selectedMethod === "topic" ? "Argomenti aggiunti:" : "Contenuti caricati:"}
                    </p>
                    <div className={styles.uploadedFiles}>
                      {submittedValue.map((fileName) => (
                        <div key={fileName} className={styles.fileCard}>
                          <span className={styles.fileName}>{fileName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className={styles.inputReminder}>
                    Contenuto caricato: <strong>{submittedValue}</strong>
                  </p>
                )}
                <div className={styles.actionButtons}>
                  <Button type="button" variant="solid" onClick={handleStartGeneration}>
                    Genera
                  </Button>
                  <Button type="button" variant="outline" onClick={handleBack}>
                    Indietro
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

const METHODS = [
  {
    id: "notes",
    title: "Carica i tuoi appunti",
    description: "Carica i tuoi file di appunti per iniziare.",
    img: "/file.png",
    alt: "Un robot che riceve file",
  },
  {
    id: "video",
    title: "Link di video da YouTube",
    description: "Inserisci link di video YouTube.",
    img: "/youtube.png",
    alt: "Un robot che riceve video",
  },
  {
    id: "topic",
    title: "Scegli l'argomento",
    description: "Seleziona un argomento da studiare.",
    img: "/argomento.png",
    alt: "Un robot che riceve argomento",
  },
];