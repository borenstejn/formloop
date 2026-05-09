"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function ThanksPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          maxWidth: 480,
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.15,
            duration: 0.5,
            type: "spring",
            stiffness: 200,
          }}
          style={{ color: "#10b981" }}
        >
          <CheckCircle2 size={64} strokeWidth={1.5} />
        </motion.div>
        <h1 style={{ fontSize: 32, fontWeight: 500, margin: 0 }}>Merci !</h1>
        <p style={{ color: "#6b7280", fontSize: 17, lineHeight: 1.5 }}>
          Tes réponses ont été envoyées. Tu peux fermer cet onglet.
        </p>
      </motion.div>
    </main>
  );
}
