# TESTING.md - CookedAI Quality Assurance & Test Report

## 1. Overview
This document records the manual testing strategy, test cases, edge case handling, and verification results for **CookedAI**, ensuring a polished, robust experience across all devices and network conditions.

---

## 2. Test Execution Checklist

| Test Case | Scenario / Action | Expected Result | Status | Observations / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Connectivity Failure** | Terminate the FastAPI backend (`uvicorn`) while the frontend is running and attempt a prediction. | User is gracefully redirected to the home screen with a bouncing red error banner explaining the connection failure. | **PASS** | Error state handled gracefully without crashing or freezing UI. |
| **Input Validation** | Attempt to join a multiplayer room without entering a nickname. | App blocks entry and displays a clear validation error message. | **PASS** | Prevents empty/malformed nickname submissions. |
| **Data Persistence** | Complete a test, unlock badges, earn XP, and refresh the browser (`F5`). | Player level, XP progress, and unlocked badges remain fully intact via `localStorage`. | **PASS** | State successfully persists across browser sessions. |
| **Back/Forward Navigation** | Progress to the final questionnaire step, click "Back", change slider values, and click "Next". | Previous answers are correctly retained, and the final score updates dynamically based on modified inputs. | **PASS** | Spread operator (`...prev`) state management prevents data loss. |
| **Responsive Design** | Scale browser viewport down to mobile dimensions (360px width) and test touch/click targets. | UI elements stack vertically, cards wrap correctly, and interactive sliders/buttons remain fully accessible without horizontal overflow. | **PASS** | Tailwind mobile-first utilities (`flex-col`, `sm:flex-row`) function flawlessly. |
| **Empty Room Handling** | Create or join a multiplayer room before any other players finish. | Leaderboard displays a clean "Waiting for players to finish..." state rather than throwing undefined errors. | **PASS** | Empty array mapping handled securely in React state. |

---

## 3. Resilience & Edge Case Analysis
* **Network Latency:** The `calculating` view features rotating dynamic loading messages (`LOADING_MESSAGES`) driven by a `useEffect` interval, masking asynchronous prediction delays and providing smooth UX feedback.
* **Score Bounding:** All calculated scores are clamped between `0` and `100` (`Math.max(0, min(100, ...))`) on both the frontend and backend, preventing anomalous input ranges from breaking UI components.
* **Accessibility:** Form controls include proper `aria-label` attributes to ensure compatibility with screen readers and accessibility standards.

---
*Tested and verified for production readiness.*