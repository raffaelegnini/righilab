"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "motion/react";
import Button from "@/components/Button";
import { QuestionRenderer } from "@/components/questions";
import { getQuestionsForAdventure } from "@/utils/gameConfig";
import { useLesson } from "@/components/LessonProvider";
import styles from "./AdventureGame.module.css";

/** Metti qui gli screenshot in `public/tutorial-avventura/` (es. step-1.png … step-3.png). */
const AVVENTURA_HOW_TO_STEPS = [
  {
    step: 1,
    title: "Rispondi alle domande",
    description:
      "Apri il pulsante della domanda: le risposte giuste sulla lezione ti fanno tirare il dado e avanzare di più caselle lungo il percorso.",
    imageSrc: "/tutorial-avventura/step-1.png",
    imageAlt: "Schermata: domanda e avanzamento sulla mappa",
  },
  {
    step: 2,
    title: "Raggiungi l’arrivo prima del fuoco",
    description:
      "Dal terzo round il fuoco si muove sul tabellone. Se ti raggiunge o ti supera mentre non sei ancora sul traguardo, la partita finisce.",
    imageSrc: "/tutorial-avventura/step-2.png",
    imageAlt: "Schermata: round, dado fuoco e pedina",
  },
  {
    step: 3,
    title: "Bonus e traguardo",
    description:
      "Le caselle con l’icona dado ti fanno tirare di nuovo gratis. Arriva alla casella Fine per vincere.",
    imageSrc: "/tutorial-avventura/step-3.png",
    imageAlt: "Schermata: caselle bonus o traguardo",
  },
];

function HowToShot({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={styles.howToPlaceholder}>
        Aggiungi il file <code style={{ fontSize: "0.7rem" }}>{src}</code> nella cartella{" "}
        <code style={{ fontSize: "0.7rem" }}>public/tutorial-avventura/</code>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={styles.howToImg}
      sizes="(max-width: 900px) 100vw, 33vw"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

function lessonStableKey(lesson) {
  if (!lesson) return "";
  try {
    const mdx = typeof lesson.bodyMdx === "string" ? lesson.bodyMdx.trim() : "";
    if (mdx) return `${lesson.title || ""}::mdx::${mdx.slice(0, 12000)}`;
    return `${lesson.title}::${JSON.stringify(lesson.sections ?? [])}`;
  } catch {
    return lesson.title ?? "";
  }
}

export default function AdventureGame() {
  const { lesson } = useLesson();
  const lessonKey = useMemo(() => lessonStableKey(lesson), [lesson]);
  const stepsRef = useRef(0);
  const roundRef = useRef(1);

  const [phase, setPhase] = useState("loading"); // Parte subito in loading
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [steps, setSteps] = useState(0);
  const [flameStep, setFlameStep] = useState(null);
  const [round, setRound] = useState(1);
  const [diceValue, setDiceValue] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  /** Domanda fissata all’apertura del modal (evita salti se `questions` si aggiorna in background). */
  const [modalQuestion, setModalQuestion] = useState(null);
  const [bonusCells, setBonusCells] = useState([]);
  const [flameDiceValue, setFlameDiceValue] = useState(null);
  /** Modal introduttivo 3 step (mostrato sopra il caricamento finché l’utente non conferma). */
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  /** Numeri casuali veloci durante il lancio (feedback visivo). */
  const [rollingTease, setRollingTease] = useState(null);
  /** Numero finale del dado mostrato per qualche secondo dopo il lancio. */
  const [revealedRoll, setRevealedRoll] = useState(null);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    function onResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isRolling) {
      setRollingTease(null);
      return;
    }
    const id = setInterval(() => {
      setRollingTease(Math.floor(Math.random() * 6) + 1);
    }, 85);
    return () => clearInterval(id);
  }, [isRolling]);

  // Modifica la funzione handleAnswer per chiudere il modal dopo la risposta
  const handleAnswerWithClose = (answer) => {
    handleAnswer(answer);
    setIsModalOpen(false);
    setModalQuestion(null);
  };

  const openQuestionModal = () => {
    setModalQuestion(questions[currentIndex] ?? null);
    setIsModalOpen(true);
  };

  const closeQuestionModal = () => {
    setIsModalOpen(false);
    setModalQuestion(null);
  };

  const finalizeTurn = useCallback(() => {
    const nextRound = roundRef.current + 1;
    setRound(nextRound);

    if (nextRound === 3) {
      setFlameStep(0);
      setFlameDiceValue(0);
    } else if (nextRound > 3) {
      const currentRoll = Math.floor(Math.random() * 3) + 1;
      setFlameDiceValue(currentRoll);
      setFlameStep((prev) => prev + currentRoll);
    }

    setCurrentIndex((prevIdx) => {
      if (prevIdx < questions.length - 1) {
        return prevIdx + 1;
      }
      if (stepsRef.current < 29) {
        setPhase("lose");
      }
      return prevIdx;
    });
  }, [questions.length]);

  const finalizeTurnRef = useRef(finalizeTurn);
  finalizeTurnRef.current = finalizeTurn;

  const rollDice = useCallback(
    (onComplete) => {
      setIsRolling(true);
      setRevealedRoll(null);
      setDiceValue(null);
      setTimeout(() => {
        const roll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(roll);
        setIsRolling(false);
        setRevealedRoll(roll);

        setTimeout(() => {
          setRevealedRoll(null);

          const prev = stepsRef.current;
          const next = prev + roll;
          stepsRef.current = next;
          setSteps(next);

          if (next >= 29) {
            setPhase("win");
            return;
          }

          if (bonusCells.includes(next)) {
            setTimeout(() => rollDice(onComplete), 600);
            return;
          }

          onComplete?.();
        }, 1400);
      }, 1000);
    },
    [bonusCells]
  );

  const loadGame = useCallback(
    async (opts = {}) => {
      const isCancelled = opts.isCancelled ?? (() => false);
      setPhase("loading");
      setError(null);
      try {
        const res = await fetch("/api/generate-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameKey: "adventure",
            difficulty: "medio",
            lesson: lesson
              ? {
                title: lesson.title,
                sections: lesson.sections ?? [],
                bodyMdx: typeof lesson.bodyMdx === "string" ? lesson.bodyMdx : "",
              }
              : { title: "Lezione", sections: [], bodyMdx: "" },
          }),
        });

        if (isCancelled()) return;
        if (!res.ok) throw new Error("Errore nel caricamento domande");

        const data = await res.json();
        if (isCancelled()) return;

        const q = getQuestionsForAdventure(data.steps || []);

        setQuestions(q);
        const generatedBonus = [];
        while (generatedBonus.length < 2) {
          const rand = Math.floor(Math.random() * 26) + 2;
          if (!generatedBonus.includes(rand)) generatedBonus.push(rand);
        }
        setBonusCells(generatedBonus);
        stepsRef.current = 0;
        roundRef.current = 1;
        setSteps(0);
        setFlameStep(-5);
        setRound(1);
        setCurrentIndex(0);
        setPhase("playing");
      } catch (err) {
        if (!isCancelled()) {
          setError(err.message);
          setPhase("error");
        }
      }
    },
    [lesson]
  );

  useEffect(() => {
    let cancelled = false;
    loadGame({ isCancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [lessonKey, loadGame]);

  const handleAnswer = (correct) => {
    if (correct) {
      rollDice(() => finalizeTurnRef.current());
    } else {
      finalizeTurn();
    }
  };

  // Fuoco insegue da round 4; a inizio round 3 giocatore e fuoco sono entrambi su 0 — confrontare solo dopo.
  useEffect(() => {
    if (phase === "playing" && round > 3 && flameStep !== null && flameStep >= steps) {
      setPhase("lose");
    }
  }, [flameStep, steps, phase, round]);

  return (
    <div className={styles.game}>
      <AnimatePresence>
        {showHowToPlayModal && (
          <motion.div
            className={styles.howToOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowHowToPlayModal(false)}
          >
            <motion.div
              className={styles.howToPanel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="howto-avventura-title"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="howto-avventura-title" className={styles.howToTitle}>
                Come funziona l’Avventura
              </h2>
              <p className={styles.howToSubtitle}>
                Tre passaggi rapidi mentre il gioco si prepara. Puoi chiudere quando sei pronto: il caricamento continua sotto.
              </p>
              <div className={styles.howToGrid}>
                {AVVENTURA_HOW_TO_STEPS.map((item) => (
                  <div key={item.step} className={styles.howToColumn}>
                    <span className={styles.howToNum} aria-hidden>
                      {item.step}
                    </span>
                    <h3 className={styles.howToStepTitle}>{item.title}</h3>
                    <p className={styles.howToStepDesc}>{item.description}</p>
                    <div className={styles.howToShot}>
                      <HowToShot src={item.imageSrc} alt={item.imageAlt} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.howToActions}>
                <button type="button" className={styles.howToStartBtn} onClick={() => setShowHowToPlayModal(false)}>
                  Inizia
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. LOADING (Appare subito) */}
      {phase === "loading" && (
        <section className={styles.loadingSection}>
          <Image
            src="/Robot%20Mascotte%20Assets/4_VID_Caricamento_final.gif"
            width={250}
            height={250}
            alt="Loading"
            unoptimized
            className={styles.mascotGif}
          />
          <p>Preparazione Avventura...</p>
        </section>
      )}

      {/* 2. ERRORE */}
      {phase === "error" && (
        <section className={styles.section}>
          <h2>Ops! Qualcosa è andato storto</h2>
          <p>{error}</p>
          <Button href="/giochi">Riprova</Button>
        </section>
      )}

      {/* 3. GIOCO */}
      {phase === "playing" && (
        <section className={styles.boardSection}>
          <div className={styles.gameHeader}>
            <div className={styles.statBox}>
              <span className={styles.label}>ROUND</span>
              <strong className={styles.value}>{round}</strong>
            </div>

            {/* Box per il Fuoco */}
            <div className={`${styles.statBox} ${styles.flameBox}`}>
              <span className={styles.label}>DADO FUOCO</span>
              <strong className={styles.value} style={{ color: '#ff4d4d' }}>
                {flameDiceValue ? `+${flameDiceValue}` : "-"}
              </strong>
            </div>

            <div className={`${styles.diceBox} ${isRolling ? styles.diceBoxRolling : ""}`}>
              <span className={styles.label}>TUO DADO</span>
              <strong className={styles.value}>
                {isRolling ? (rollingTease ?? "…") : diceValue ?? "—"}
              </strong>
            </div>
          </div>

          <AnimatePresence>
            {(isRolling || revealedRoll != null) && (
              <motion.div
                className={styles.diceRollOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <motion.div
                  className={`${styles.diceRollCard} ${revealedRoll != null ? styles.diceRollCardReveal : ""}`}
                  initial={{ scale: 0.92, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                >
                  <motion.span
                    className={styles.diceRollEmoji}
                    aria-hidden
                    animate={
                      isRolling
                        ? { rotate: [0, -18, 18, -14, 14, 0], y: [0, -4, 0] }
                        : { rotate: 0, y: 0, scale: [1, 1.15, 1] }
                    }
                    transition={
                      isRolling
                        ? { repeat: Infinity, duration: 0.45, ease: "easeInOut" }
                        : { duration: 0.5, ease: "easeOut" }
                    }
                  >
                    🎲
                  </motion.span>
                  <span className={styles.diceRollNumber} aria-live="polite">
                    {isRolling ? (rollingTease ?? "…") : revealedRoll}
                  </span>
                  <p className={styles.diceRollTitle}>
                    {isRolling ? "Lancio del dado" : `Hai ottenuto +${revealedRoll}!`}
                  </p>
                  <p className={styles.diceRollHint}>
                    {isRolling ? "Tra poco avanzerai sul tabellone" : "Avanzi sul tabellone…"}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.gridContainer}>

            {[...Array(30)].map((_, index) => {
              const rowIndex = Math.floor(index / 5);
              const isReversed = rowIndex % 2 !== 0;
              const visualNumber = isReversed ? (rowIndex * 5 + 4) - (index % 5) : index;
              const isGreen = visualNumber <= steps;
              const isBurned = visualNumber <= flameStep
              const isBonus = bonusCells.includes(visualNumber);
              const isPlayerHere = visualNumber === steps;
              const isFlameHere = flameStep !== null && visualNumber === flameStep;

              return (
                <div key={index} className={`${styles.cell}
                ${visualNumber === 0 || visualNumber === 29 ? styles.startEnd : ""}
                ${isGreen && !isBurned && (visualNumber !== 0 && visualNumber !== 29) ? styles.completed : ""}
                ${isBurned && (visualNumber !== 0 && visualNumber !== 29) ? styles.burned : ""}
                ${isBonus ? styles.bonusCell : ""}`}>
                  {visualNumber === 0 && !isPlayerHere && !isFlameHere && <span className={styles.stepNumber}>Inizio</span>}
                  {visualNumber === 29 && !isPlayerHere && !isFlameHere && <span className={styles.stepNumber}>Fine</span>}
                  {!isPlayerHere && !isFlameHere && visualNumber != 0 && visualNumber != 29 && !isBonus && <span className={styles.stepNumber}>{visualNumber + 1}</span>}
                  {isPlayerHere && <motion.div layoutId="p" className={styles.playerPawn}><Image src="/Robot%20Mascotte%20Game%20Assets/GIOCO_AVVENTURA_Robot_PEDINA.png" width={70} height={70} alt="R" /></motion.div>}
                  {isFlameHere && <motion.div layoutId="f" className={styles.flamePawn}>🔥</motion.div>}
                  {isBonus && !isPlayerHere && !isFlameHere && <span className={styles.bonusIcon}>🎲</span>}
                </div>
              );
            })}
          </div>

          {/* PULSANTE PER APRIRE IL MODAL */}
          <div className={styles.actionArea}>
            {!isRolling && revealedRoll == null && questions[currentIndex] && !isModalOpen && (
              <button
                className={styles.openQuestionBtn}
                onClick={openQuestionModal}
              >
                Rispondi alla Domanda #{currentIndex + 1}
              </button>
            )}
          </div>

          {/* MODAL DELLA DOMANDA */}
          <AnimatePresence>
            {isModalOpen && (
              <motion.div
                className={styles.modalOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className={styles.modalContent}
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, y: 20 }}
                >
                  <button className={styles.closeBtn} onClick={closeQuestionModal}>×</button>

                  <p className={styles.progress}>
                    Domanda #{currentIndex + 1}
                  </p>

                  <QuestionRenderer
                    question={modalQuestion ?? questions[currentIndex]}
                    onAnswer={handleAnswerWithClose}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* 4. FINE GIOCO */}
      {(phase === "win" || phase === "lose") && (
        <section className={`${styles.resultSection} ${phase === "win" ? styles.resultSectionWin : ""}`}>
          {phase === "win" && windowSize.width > 0 && (
            <div className={styles.confettiLayer} aria-hidden>
              <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle
                numberOfPieces={260}
                gravity={0.22}
                wind={0.02}
                friction={0.99}
                colors={["#1a7083", "#38bdf8", "#5eead4", "#99f6e4", "#fbbf24", "#ffffff", "#0f5666", "#22d3ee"]}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          )}
          <Image src={phase === "win" ? "/Robot%20Mascotte%20Assets/5_VID_Felice_final.gif" : "/Robot%20Mascotte%20Assets/3_VID_Triste_final.gif"} width={200} height={200} alt="Res" unoptimized />
          <h2>{phase === "win" ? "Vittoria!" : "Game Over!"}</h2>
          <Button onClick={loadGame} variant="solid">Gioca Ancora</Button>
        </section>
      )}
    </div>
  );
}