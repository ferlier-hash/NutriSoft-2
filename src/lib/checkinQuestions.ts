import {z} from 'zod';
export const questionSchema=z.object({id:z.string(),text:z.string(),type:z.enum(['scale','yesno','choice','text']),enabled:z.boolean(),required:z.boolean(),archived:z.boolean(),options:z.array(z.string()),alert:z.object({op:z.enum(['lte','gte','in']),values:z.array(z.string())}).nullable()});
export type CheckinQuestion=z.infer<typeof questionSchema>;
export const suggestions:Array<{text:string;type:CheckinQuestion['type'];options?:string[]}>= [
 {text:'¿Cómo estuvo tu energía? (1: muy baja · 5: muy alta)',type:'scale'},
 {text:'¿Qué tan posible te resultó seguir el plan? (1: muy difícil · 5: muy fácil)',type:'scale'},
 {text:'¿Cómo descansaste?',type:'choice',options:['Muy mal','Mal','Regular','Bien','Muy bien']},
];
export function newQuestion(suggestion:typeof suggestions[number]={text:'Nueva pregunta',type:'text'}):CheckinQuestion{return{id:crypto.randomUUID(),text:suggestion.text,type:suggestion.type,options:suggestion.options??[],enabled:true,required:false,archived:false,alert:null};}
