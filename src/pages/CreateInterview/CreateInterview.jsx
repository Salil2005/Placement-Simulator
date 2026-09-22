// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useForm } from "react-hook-form";
// import Card from "../../components/ui/Card.jsx";
// import Select from "../../components/ui/Select.jsx";
// import Input from "../../components/ui/Input.jsx";
// import Button from "../../components/ui/Button.jsx";
// import { interviewService } from "../../services/interviewService.js";
// import {
//   CATEGORIES,
//   DIFFICULTIES,
//   PROGRAMMING_LANGUAGES,
//   QUESTION_COUNTS,
// } from "../../constants/interviewOptions.js";

// export default function CreateInterview() {
//   const { register, handleSubmit, watch } = useForm({
//     defaultValues: {
//       category: "dsa",
//       role: "",
//       experience: "0-1 years",
//       difficulty: "medium",
//       questionCount: 5,
//       programmingLanguage: "javascript",
//     },
//   });
//   const navigate = useNavigate();
//   const [resumeFile, setResumeFile] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const category = watch("category");

//   const onSubmit = async (data) => {
//     setLoading(true);
//     setError(null);
//     try {
//       const { interview } = await interviewService.create(data, resumeFile);
//       navigate(`/interview/${interview._id}`);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
//       <h1 className="mb-1 text-2xl font-extrabold">Configure your interview</h1>
//       <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
//         Pick a category, role, and difficulty - the AI adapts questions as you go.
//       </p>

//       <Card>
//         {error && (
//           <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
//             {error}
//           </div>
//         )}

//         <form onSubmit={handleSubmit(onSubmit)}>
//           <Select label="Interview Category" options={CATEGORIES} {...register("category")} />
//           <Input label="Target Role" placeholder="e.g. SDE-2 Backend" {...register("role", { required: true })} />
//           <Input label="Experience" placeholder="e.g. 2-4 years" {...register("experience")} />
//           <Select label="Difficulty" options={DIFFICULTIES} {...register("difficulty")} />
//           <Select
//             label="Number of Questions"
//             options={QUESTION_COUNTS.map((n) => ({ value: n, label: `${n} questions` }))}
//             {...register("questionCount")}
//           />

//           {category === "dsa" && (
//             <Select
//               label="Programming Language"
//               options={PROGRAMMING_LANGUAGES}
//               {...register("programmingLanguage")}
//             />
//           )}

//           <div className="mb-6">
//             <label className="label">Resume (optional)</label>
//             <input
//               type="file"
//               accept=".pdf,.doc,.docx"
//               onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
//               className="input"
//             />
//             <p className="mt-1 text-xs text-slate-400">Upload your resume for a more tailored interview.</p>
//           </div>

//           <Button type="submit" disabled={loading} className="w-full">
//             {loading ? "Setting up..." : "Start Interview"}
//           </Button>
//         </form>
//       </Card>
//     </div>
//   );
// }
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { interviewService } from "../../services/interviewService.js";
import {
  CATEGORIES,
  DIFFICULTIES,
  PROGRAMMING_LANGUAGES,
  QUESTION_COUNTS,
} from "../../constants/interviewOptions.js";

export default function CreateInterview() {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      category: "dsa",
      role: "",
      experience: "0-1 years",
      difficulty: "medium",
      questionCount: 5,
      programmingLanguage: "javascript",
    },
  });
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const category = watch("category");

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const { interview } = await interviewService.create(data, resumeFile);
      navigate(`/interview/${interview._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
      <h1 className="mb-1 text-2xl font-extrabold">Configure your interview</h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
        Pick a category, role, and difficulty - the AI adapts questions as you go.
      </p>

      <Card>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Interview Category */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Interview Category
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              {...register("category", { required: true })}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value || cat} value={cat.value || cat}>
                  {cat.label || cat}
                </option>
              ))}
            </select>
          </div>

          <Input label="Target Role" placeholder="e.g. SDE-2 Backend" {...register("role", { required: true })} />
          
          <Input label="Experience" placeholder="e.g. 2-4 years" {...register("experience")} />

          {/* Difficulty */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Difficulty
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              {...register("difficulty", { required: true })}
            >
              {DIFFICULTIES.map((diff) => (
                <option key={diff.value || diff} value={diff.value || diff}>
                  {diff.label || diff}
                </option>
              ))}
            </select>
          </div>

          {/* Number of Questions */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Number of Questions
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              {...register("questionCount")}
            >
              {QUESTION_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
            </select>
          </div>

          {category === "dsa" && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Programming Language
              </label>
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                {...register("programmingLanguage")}
              >
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <option key={lang.value || lang} value={lang.value || lang}>
                    {lang.label || lang}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Resume (optional)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-300"
            />
            <p className="mt-1 text-xs text-slate-400">Upload your resume for a more tailored interview.</p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Setting up..." : "Start Interview"}
          </Button>
        </form>
      </Card>
    </div>
  );
}