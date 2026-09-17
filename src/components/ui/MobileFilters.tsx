import {useState,type ReactNode} from 'react';
import {SlidersHorizontal} from 'lucide-react';
import {Button} from './Button';

export function MobileFilters({children,activeCount=0,className='grid gap-3 lg:grid-cols-4'}:{children:ReactNode;activeCount?:number;className?:string}){
 const [open,setOpen]=useState(false);
 return <div className="space-y-3"><div className="flex items-center justify-between lg:hidden"><p className="text-sm font-semibold">Buscar y filtrar</p><Button type="button" size="sm" variant="secondary" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><SlidersHorizontal className="h-4 w-4"/>Filtros{activeCount?` (${activeCount})`:''}</Button></div><div className={`${open?'grid':'hidden'} ${className} lg:grid`}>{children}</div></div>;
}
