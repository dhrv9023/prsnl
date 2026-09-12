# 06 — Production Failure-Mode Playbook
### *Appendix 3 of the Kareerist Self-Hosted AI Models Blueprint*
**Audience:** On-Call Engineers, Platform Reliability, and ML Engineers  
**Use Case:** 3 AM Production Incident Diagnostics & Remediation

---

## Diagnostic Triage Matrix

When a production degradation or failure occurs, locate the symptom in this matrix before altering code or weights. Diagnose strictly in the indicated order.

| Failure Symptom | Primary Root Cause | Diagnostic Verification | Remediation Procedure |
| :--- | :--- | :--- | :--- |
| **Output JSON cuts off abruptly mid-bracket** | Context window overflow during training or serving. | Inspect token count of prompt + generated output. | Set `max_seq_length = 8192` in training; split long task into parallel sections. |
| **Model continues generating past EOS token** | Missing `<\|im_end\|>` special token in training data. | Inspect raw output string with special tokens visible (`repr(text)`). | Reformat dataset using `tokenizer.apply_chat_template` with `add_generation_prompt=False`. |
| **Model repeats input resume back to user** | Missing response-only loss masking during training. | Verify if user prompt tokens incurred loss during training. | Add `train_on_responses_only` to mask user instructions from loss calculation. |
| **Instruction-following breaks down completely** | Mismatch between training and inference chat templates. | Compare raw strings at train time vs. inference time. | Standardize on a single version-controlled ChatML template across training and serving. |
| **All candidates receive ~71/100 regardless of resume** | Teacher scoring labels were uncalibrated label noise. | Check Spearman rank correlation against gold-standard resumes. | Re-generate labels using an anchored rubric, median-of-3 voting, and temperature 0. |
| **Scores vary by $\pm 15$ points on identical inputs** | Sampling temperature set above 0 for scoring tasks. | Verify generation parameters for scoring calls. | Enforce `temperature=0.0` for all quantitative evaluations. |
| **Model works on synthetic data, fails on uploaded PDFs** | Training data lacked real-world PDF extraction noise. | Compare synthetic test strings to production parser outputs. | Compile synthetic resumes to PDFs and re-extract with production parser to inject noise. |
| **Hinglish sounds formal and robotic** | Teacher model produced formal Hindi rather than colloquial speech. | Have native speakers evaluate output naturalness. | Anchor the dataset with 800 human-curated technical Hinglish samples. |
| **Devanagari characters leak into output** | Base model prior favors Devanagari for Hindi tokens. | Check regex `[\u0900-\u097F]` across generated outputs. | Apply negative logit bias to the Devanagari Unicode range in vLLM. |
| **Quality dropped noticeably after quantization** | 4-bit quantization degraded numeric and structural weights. | Compare evaluation scorecard between 16-bit master and AWQ artifact. | Re-quantize using FP8 or serve full 16-bit weights on an L40S GPU. |
| **Model emits JSON when asked a conversational question** | Catastrophic forgetting from training exclusively on JSON data. | Send 20 standard open-ended conversational prompts. | Mix 8–10% general instruction data (OpenHermes/Tulu) into the training dataset and retrain. |
| **OOM errors under concurrent user load** | Unbounded KV cache growth on long context windows. | Monitor VRAM allocation during load testing. | Lower `--max-num-seqs` or switch base model to AWQ / FP8 quantization. |
| **p95 latency is acceptable, but p99 latency spikes** | Unbounded queue depth under peak load spikes. | Monitor `num_waiting` metric in vLLM Prometheus stream. | Set a maximum request queue depth; return honest queue position messages to users. |
| **Resume scores 98/100 despite having zero metrics** | Indirect prompt injection embedded in candidate PDF. | Extract raw PDF text and search for hidden white or sub-2pt text. | Sanitize inputs; wrap resume in XML delimiters; add adversarial injection training examples. |
| **v3 model is worse than v2, but cause is unknown** | Missing MLOps lineage, seed tracking, or config logging. | Inspect `manifest.json` in the model artifact directory. | Enforce mandatory Git SHA, dataset checksum, and W&B logging on all training runs. |

---

## The Architectural Meta-Lesson

> **11 out of these 15 failure modes are data, templating, or inference configuration bugs—NOT base model capacity flaws.**

When production output degrades, the instinctive reaction is to assume the 8B or 14B model is "not smart enough" and that a larger model is required. In practice, the failure is almost always:
1. Context truncation (`max_seq_length`)
2. Missing loss masking (`train_on_responses_only`)
3. ChatML template mismatches between training and serving
4. Label noise in teacher scores
5. Training on pristine synthetic text that fails on messy production PDFs

**Always audit and verify these five items before attempting hyperparameter changes or switching base models.**
