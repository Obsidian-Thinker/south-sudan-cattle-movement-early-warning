#!/usr/bin/env python3
"""
South Sudan Early Warning System - Model Validation
"""

import os
import pandas as pd
import numpy as np

# Keep matplotlib cache local to this workspace to avoid permission issues.
os.environ.setdefault("MPLCONFIGDIR", ".matplotlib")

import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    roc_auc_score, roc_curve, confusion_matrix, 
    classification_report, precision_recall_curve
)

# ============================================================================
# LOAD DATA
# ============================================================================

print("="*70)
print("SOUTH SUDAN EARLY WARNING SYSTEM - VALIDATION ANALYSIS")
print("="*70)

# Load exported validation dataset
df = pd.read_csv('validation_dataset_full.csv')

# Fill missing EWI using available component signals.
component_cols_for_ewi = [
    'cattle_convergence',
    'conflict_risk',
    'resource_stress',
    'access_constraints',
    'water_score',
    'forage_score'
]
missing_ewi_before = int(df['ewi'].isna().sum())
if missing_ewi_before > 0:
    df['ewi'] = df['ewi'].fillna(df[component_cols_for_ewi].mean(axis=1, skipna=True))
    missing_ewi_after = int(df['ewi'].isna().sum())
    filled_ewi = missing_ewi_before - missing_ewi_after
    print(f"\nFilled missing EWI values: {filled_ewi}/{missing_ewi_before} rows")

print(f"\nDataset loaded: {len(df)} samples")
print(f"  Conflicts: {df['conflict_occurred'].sum()}")
print(f"  Non-conflicts: {len(df) - df['conflict_occurred'].sum()}")

# ============================================================================
# 1. OVERALL MODEL PERFORMANCE (EWI)
# ============================================================================

print("\n" + "="*70)
print("1. EARLY WARNING INDEX (EWI) PERFORMANCE")
print("="*70)

# ROC-AUC
auc = roc_auc_score(df['conflict_occurred'], df['ewi'])
print(f"\n✓ ROC-AUC Score: {auc:.3f}")
print(f"  Interpretation: ", end="")
if auc > 0.8:
    print("EXCELLENT - Strong predictive power")
elif auc > 0.7:
    print("GOOD - Useful for operational decisions")
elif auc > 0.6:
    print("FAIR - Better than random, needs improvement")
else:
    print("POOR - Model needs major revision")

# Test multiple thresholds
print("\n" + "-"*70)
print("PERFORMANCE AT DIFFERENT THRESHOLDS:")
print("-"*70)
print(f"{'Threshold':<12} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'Accuracy':<12}")
print("-"*70)

for threshold in [0.4, 0.5, 0.6, 0.7]:
    pred = (df['ewi'] >= threshold).astype(int)
    
    # Calculate metrics
    tn, fp, fn, tp = confusion_matrix(df['conflict_occurred'], pred).ravel()
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    accuracy = (tp + tn) / (tp + tn + fp + fn)
    
    print(f"{threshold:<12.1f} {precision:<12.3f} {recall:<12.3f} {f1:<12.3f} {accuracy:<12.3f}")

print("-"*70)
print("Precision = When model says 'high risk', how often is it right?")
print("Recall = Of all conflicts, how many did we detect?")
print("F1 = Balanced metric (harmonic mean of precision & recall)")

# Find optimal threshold
fpr, tpr, thresholds = roc_curve(df['conflict_occurred'], df['ewi'])
optimal_idx = np.argmax(tpr - fpr)
optimal_threshold = thresholds[optimal_idx]
print(f"\n✓ Optimal threshold: {optimal_threshold:.3f}")

# ============================================================================
# 2. COMPONENT ANALYSIS
# ============================================================================

print("\n" + "="*70)
print("2. COMPONENT PERFORMANCE (INDIVIDUAL INDICATORS)")
print("="*70)

components = {
    'Cattle Convergence': 'cattle_convergence',
    'Conflict Risk': 'conflict_risk',
    'Resource Stress': 'resource_stress',
    'Water Score': 'water_score',
    'Forage Score': 'forage_score'
}

print(f"\n{'Component':<25} {'AUC':<10} {'Mean@Conflict':<15} {'Mean@NoConflict':<15}")
print("-"*70)

for name, col in components.items():
    auc_comp = roc_auc_score(df['conflict_occurred'], df[col])
    mean_conflict = df[df['conflict_occurred']==1][col].mean()
    mean_no_conflict = df[df['conflict_occurred']==0][col].mean()
    print(f"{name:<25} {auc_comp:<10.3f} {mean_conflict:<15.3f} {mean_no_conflict:<15.3f}")

# ============================================================================
# 3. PRIORITY ZONE VALIDATION
# ============================================================================

print("\n" + "="*70)
print("3. PRIORITY ZONE CLASSIFICATION VALIDATION")
print("="*70)

priority_map = {1: 'CRITICAL', 2: 'HIGH ALERT', 3: 'WATCH', 4: 'STABLE'}

print(f"\n{'Priority Class':<20} {'Total Samples':<15} {'Conflicts':<12} {'Conflict %':<12}")
print("-"*70)

for priority in sorted(df['priority_class'].unique()):
    if priority == 0 or np.isnan(priority):
        continue
    subset = df[df['priority_class'] == priority]
    conflicts = subset['conflict_occurred'].sum()
    pct = (conflicts / len(subset) * 100) if len(subset) > 0 else 0
    label = priority_map.get(int(priority), 'Unknown')
    print(f"{label:<20} {len(subset):<15} {conflicts:<12} {pct:<12.1f}%")

# ============================================================================
# 4. VISUALIZATIONS
# ============================================================================

print("\n" + "="*70)
print("4. GENERATING VISUALIZATIONS")
print("="*70)

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# A. ROC Curve
fpr, tpr, _ = roc_curve(df['conflict_occurred'], df['ewi'])
axes[0, 0].plot(fpr, tpr, linewidth=2, label=f'EWI (AUC={auc:.3f})')
axes[0, 0].plot([0, 1], [0, 1], 'k--', label='Random')
axes[0, 0].set_xlabel('False Positive Rate')
axes[0, 0].set_ylabel('True Positive Rate')
axes[0, 0].set_title('ROC Curve')
axes[0, 0].legend()
axes[0, 0].grid(alpha=0.3)

# B. Precision-Recall Curve
precision, recall, _ = precision_recall_curve(df['conflict_occurred'], df['ewi'])
axes[0, 1].plot(recall, precision, linewidth=2)
axes[0, 1].set_xlabel('Recall')
axes[0, 1].set_ylabel('Precision')
axes[0, 1].set_title('Precision-Recall Curve')
axes[0, 1].grid(alpha=0.3)

# C. EWI Distribution
axes[1, 0].hist(df[df['conflict_occurred']==1]['ewi'], bins=30, alpha=0.7, 
                label='Conflict locations', color='red', density=True)
axes[1, 0].hist(df[df['conflict_occurred']==0]['ewi'], bins=30, alpha=0.7, 
                label='Non-conflict locations', color='blue', density=True)
axes[1, 0].set_xlabel('Early Warning Index')
axes[1, 0].set_ylabel('Density')
axes[1, 0].set_title('EWI Distribution by Outcome')
axes[1, 0].legend()
axes[1, 0].axvline(optimal_threshold, color='black', linestyle='--', 
                   label=f'Optimal threshold: {optimal_threshold:.2f}')

# D. Confusion Matrix
pred_optimal = (df['ewi'] >= optimal_threshold).astype(int)
cm = confusion_matrix(df['conflict_occurred'], pred_optimal)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[1, 1],
            xticklabels=['No Conflict', 'Conflict'],
            yticklabels=['No Conflict', 'Conflict'])
axes[1, 1].set_title(f'Confusion Matrix (threshold={optimal_threshold:.2f})')
axes[1, 1].set_ylabel('Actual')
axes[1, 1].set_xlabel('Predicted')

plt.tight_layout()
plt.savefig('validation_results.png', dpi=300, bbox_inches='tight')
print("\n✓ Saved: validation_results.png")

# ============================================================================
# 5. SUMMARY REPORT
# ============================================================================

print("\n" + "="*70)
print("5. VALIDATION SUMMARY")
print("="*70)

pred_optimal = (df['ewi'] >= optimal_threshold).astype(int)
tn, fp, fn, tp = confusion_matrix(df['conflict_occurred'], pred_optimal).ravel()

precision = tp / (tp + fp)
recall = tp / (tp + fn)
f1 = 2 * (precision * recall) / (precision + recall)

print(f"""
MODEL PERFORMANCE SUMMARY
-------------------------
Overall AUC: {auc:.3f}
Optimal Threshold: {optimal_threshold:.3f}

At Optimal Threshold:
  Precision: {precision:.3f} (When predicting conflict, correct {precision*100:.1f}% of time)
  Recall: {recall:.3f} (Detecting {recall*100:.1f}% of actual conflicts)
  F1-Score: {f1:.3f}
  
Confusion Matrix:
  True Negatives:  {tn:4d} (Correctly predicted no conflict)
  False Positives: {fp:4d} (False alarms)
  False Negatives: {fn:4d} (Missed conflicts - CRITICAL)
  True Positives:  {tp:4d} (Correctly predicted conflict)

OPERATIONAL RECOMMENDATIONS
----------------------------
""")

if auc > 0.75 and recall > 0.7:
    print("✓ DEPLOY: Model ready for operational use")
    print("  - Use for resource allocation and early warning")
    print("  - Monitor false positives and adjust threshold if needed")
elif auc > 0.65:
    print("⚠ PILOT: Test in limited deployment")
    print("  - Validate with field teams before full rollout")
    print("  - Consider adding more conflict data or refining weights")
else:
    print("✗ IMPROVE: Model needs refinement")
    print("  - Review component weights")
    print("  - Add more training data")
    print("  - Consider additional features")

print("\n" + "="*70)
print("VALIDATION COMPLETE")
print("="*70)
