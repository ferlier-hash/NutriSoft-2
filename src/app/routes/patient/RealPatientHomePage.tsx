import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { loadDaily } from '../../../data/supabase/daily-followup.repository';
import { RealPatientMealPlansPage } from './RealPatientMealPlansPage';

export function RealPatientHomePage(){
 const [recommendation,setRecommendation]=useState('');
 useEffect(()=>{let active=true;void loadDaily().then(data=>{const assignment=data.assignments[0];const text=data.phrases.find(phrase=>phrase.id===assignment?.phrase_id)?.text??'';if(active)setRecommendation(text);}).catch(()=>{if(active)setRecommendation('');});return()=>{active=false;};},[]);
 return <><div className="mx-auto max-w-md px-4 pt-4">{recommendation&&<Card highlighted className="space-y-2"><p className="flex items-center gap-2 text-xs font-semibold text-brand-strong"><Sparkles className="h-4 w-4"/>Recomendación de tu nutricionista</p><blockquote className="whitespace-pre-wrap text-sm font-semibold leading-relaxed">“{recommendation}”</blockquote></Card>}</div><RealPatientMealPlansPage/></>;
}
