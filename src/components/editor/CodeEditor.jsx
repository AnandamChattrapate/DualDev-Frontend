import useMatchStore from '../../store/matchStore'
import Editor from "@monaco-editor/react";

export default function CodeEditor({ darkMode }) {
  const myLanguage = useMatchStore((s) => s.myLanguage)
  const myCode = useMatchStore((s) => s.codeByLanguage[s.myLanguage])
  const setMyCode = useMatchStore((s) => s.setMyCode)

  return (
    <Editor
      key={`${darkMode}-${myLanguage}`}   // force theme/language reload
      height="100%"
      language={myLanguage}
      theme={darkMode ? "vs-dark" : "light"}
      value={myCode}
      onChange={(value) => setMyCode(value || "")}
      options={{
        minimap: { enabled: false },
        fontSize: 18,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 10 },
      }}
    />
  )
}