"use client";
import styles from "@/app/styles/dataProvider.module.css";

export interface GherkinStep {
  keyword: "Given" | "When" | "Then" | "And" | "But";
  text: string;
}

export interface GherkinScenario {
  title: string;
  steps: GherkinStep[];
}

export interface GherkinFeature {
  feature: string;
  description: string;
  scenarios: GherkinScenario[];
}

interface Props {
  features: GherkinFeature[];
}

const KEYWORD_COLORS: Record<string, string> = {
  Given: "#bf5af2",
  When:  "#00e5ff",
  Then:  "#30d158",
  And:   "#ffd60a",
  But:   "#ff453a",
};

const FEATURE_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
];

export default function GherkinComponent({ features }: Props) {
  if (!features || features.length === 0) {
    return (
      <div className={styles.emptyEpicsState}>
        <p>No acceptance criteria yet. Ask Timeless to review your requirements to generate Gherkin scenarios.</p>
      </div>
    );
  }

  return (
    <div className={styles.gherkinContainer}>
      {features.map((feat, fi) => {
        const color = FEATURE_COLORS[fi % FEATURE_COLORS.length];
        return (
          <div key={fi} className={styles.gherkinFeatureBlock} style={{ borderLeftColor: color }}>
            {/* Feature header */}
            <div className={styles.gherkinFeatureHeader}>
              <span className={styles.gherkinKeyword} style={{ color }}>Feature:</span>
              <span className={styles.gherkinFeatureTitle}>{feat.feature}</span>
            </div>
            {feat.description && (
              <p className={styles.gherkinDescription}>{feat.description}</p>
            )}

            {/* Scenarios */}
            {feat.scenarios.map((scenario, si) => (
              <div key={si} className={styles.gherkinScenario}>
                <div className={styles.gherkinScenarioTitle}>
                  <span className={styles.gherkinKeyword} style={{ color: "rgba(226,240,251,0.50)" }}>Scenario:</span>
                  <span className={styles.gherkinScenarioName}>{scenario.title}</span>
                </div>
                <div className={styles.gherkinSteps}>
                  {scenario.steps.map((step, ki) => (
                    <div key={ki} className={styles.gherkinStep}>
                      <span
                        className={styles.gherkinStepKeyword}
                        style={{ color: KEYWORD_COLORS[step.keyword] || "#e2f0fb" }}
                      >
                        {step.keyword}
                      </span>
                      <span className={styles.gherkinStepText}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
