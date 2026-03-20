import json
from typing import List
from groq import AsyncGroq
from app.core.config import settings
from app.schemas.models import InterviewQuestion, AnswerEvaluation

client = AsyncGroq(api_key=settings.GROQ_API_KEY)

EVAL_INSTRUCTIONS = """
You are an expert technical interviewer. Evaluate the candidate's answer to the question below.
- For THEORY: Score 0-10 for correctness, depth, and clarity. Give concise, actionable feedback and a model answer.
- For MCQ: Score 10 if correct, else 0. Feedback should explain why the answer is right or wrong.
- For CODE: Score 0-10 for correctness, efficiency, and code quality. Give feedback on edge cases, time/space complexity, and suggest improvements. Provide a concise ideal solution.
Respond ONLY in valid JSON with the following shape:
{
  "score": <integer 0-10>,
  "feedback": "<exactly 2 sentences separated by a single newline>",
  "ideal_answer": "<concise strong answer>"
}
"""

async def generate_questions(role: str, experience_level: str, resume_text: str) -> List[InterviewQuestion]:
    prompt = f"""
    You are an expert technical interviewer for the role of {role} ({experience_level}).

    RESUME TEXT: {resume_text[:3000]}

    TASK:
    Design a tailored interview based strictly on the candidate's resume.

    Guidelines for choosing QUESTION TYPES:
    1. THEORY: Conceptual/design questions anchored in their projects/stack.
    2. MCQ: Concrete tools/libraries mentioned in the resume. 4 options, 1 correct.
    3. CODE: Language-agnostic LeetCode-style DSA questions. Expect uncommented code with short meaningful variables.

    CRITICAL INSTRUCTION:
    Do NOT output an array. You MUST output a JSON object with exactly 6 named keys: "q1", "q2", "q3", "q4", "q5", and "q6". Do not generate a 7th key.

    OUTPUT JSON FORMAT:
    {{
      "q1": {{ "id": 1, "type": "theory", "text": "..." }},
      "q2": {{ "id": 2, "type": "theory", "text": "..." }},
      "q3": {{ "id": 3, "type": "mcq", "text": "...", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "Option B" }},
      "q4": {{ "id": 4, "type": "mcq", "text": "...", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "Option C" }},
      "q5": {{ "id": 5, "type": "code", "text": "...", "context": "Focus on optimizing TC/SC." }},
      "q6": {{ "id": 6, "type": "code", "text": "...", "context": "Focus on handling edge cases." }}
    }}
    """

    try:
        completion = await client.chat.completions.create(
            model="qwen/qwen3-32b", 
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        data = json.loads(completion.choices[0].message.content)
        
        raw_qs = []
        for key in ["q1", "q2", "q3", "q4", "q5", "q6"]:
            if key in data:
                raw_qs.append(data[key])
            
        return [InterviewQuestion(**q) for q in raw_qs]
        
    except Exception as e:
        print(f"Gen Error: {e}")
        raise ValueError("Failed to generate questions.")


async def evaluate_single_answer(role: str, question: InterviewQuestion, user_answer: str) -> AnswerEvaluation:
    final_answer = user_answer or "No answer provided."

    if question.type == "code":
        answer_block = f"User Code:\n```\n{final_answer}\n```"
    else:
        answer_block = f"Candidate Answer:\n{final_answer}"

    options_block = ""
    if question.type == "mcq" and question.options:
        options_block = f"\nOPTIONS: {question.options}"

    prompt = f"""
    {EVAL_INSTRUCTIONS}

    QUESTION TYPE: {question.type}
    ROLE: {role}

    QUESTION:
    {question.text}
    {options_block}

    {answer_block}
    """

    try:
        completion = await client.chat.completions.create(
            model="llama3-70b-8192", 
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        eval_data = json.loads(completion.choices[0].message.content)
        return AnswerEvaluation(**eval_data)
        
    except Exception as e:
        print(f"Eval Error: {e}")
        raise ValueError("Failed to evaluate answer.")