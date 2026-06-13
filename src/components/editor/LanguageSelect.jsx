import React from 'react'
import useMatchStore from '../../store/matchStore'
export default function LanguageSelect() {
    const mylanguage=useMatchStore((s)=>s.myLanguage)
    const setMyLanguage=useMatchStore((s)=>s.setMyLanguage)

  return (
    <div>
        <select value={mylanguage} onChange={(e)=>setMyLanguage(e.target.value)}>
            <option value={"python"}>python </option>
            <option value={"cpp"}>C++</option>
            <option value={"java"}>Java</option>
        </select>
    </div>
  )
}
