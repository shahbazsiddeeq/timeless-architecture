"use client";
import React from "react";
import styles from "@/app/styles/codeGenProgress.module.css";

interface CodeGenProgressProps {
  progress: number; // 0 to 100
}

const CodeGenProgress: React.FC<CodeGenProgressProps> = ({ progress }) => {
  const progressPercent = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBarBackground}>
        <div
          className={styles.progressBarFill}
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
      <p className={styles.progressText}>{progressPercent}%</p>
    </div>
  );
};

export default CodeGenProgress;
