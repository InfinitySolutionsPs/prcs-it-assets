"use client";
import {ChangeEvent,isValidElement,ReactNode,SelectHTMLAttributes,useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";

type Props=Omit<SelectHTMLAttributes<HTMLSelectElement>,"onChange"|"multiple"|"size"> & {
 onChange?:SelectHTMLAttributes<HTMLSelectElement>["onChange"];
 searchPlaceholder?:string;
};

type SearchOption={value:string;label:string;disabled:boolean};

function nodeText(node:ReactNode):string{
 if(typeof node==="string"||typeof node==="number")return String(node);
 if(Array.isArray(node))return node.map(nodeText).join("");
 if(isValidElement<{children?:ReactNode}>(node))return nodeText(node.props.children);
 return "";
}

export default function SearchableSelect({children,name,value,defaultValue,onChange,disabled,required,placeholder,searchPlaceholder="اكتب للبحث...",className="",...rest}:Props){
 const options=useMemo<SearchOption[]>(()=>Array.from(Array.isArray(children)?children:[children]).flatMap(child=>{
  if(!isValidElement<{value?:string|number;disabled?:boolean;children?:ReactNode}>(child))return [];
  const label=nodeText(child.props.children);
  return [{value:String(child.props.value??label),label,disabled:Boolean(child.props.disabled)}];
 }),[children]);
 const firstValue=options.find(option=>!option.disabled)?.value??"";
 const isControlled=value!==undefined;
 const externalValue=Array.isArray(value)?String(value[0]??""):value!==undefined?String(value):undefined;
 const initialDefault=Array.isArray(defaultValue)?String(defaultValue[0]??""):defaultValue!==undefined?String(defaultValue):firstValue;
 const [internalValue,setInternalValue]=useState(initialDefault);
 const selectedValue=isControlled?(externalValue??""):internalValue;
 const selected=options.find(option=>option.value===selectedValue);
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState("");
 const [position,setPosition]=useState({top:0,left:0,width:240});
 const rootRef=useRef<HTMLDivElement>(null);
 const buttonRef=useRef<HTMLButtonElement>(null);
 const inputRef=useRef<HTMLInputElement>(null);

 const filtered=useMemo(()=>{
  const normalized=query.trim().toLocaleLowerCase();
  return normalized?options.filter(option=>option.label.toLocaleLowerCase().includes(normalized)):options;
 },[options,query]);

 useEffect(()=>{
  if(!isControlled&&options.length&&!options.some(option=>option.value===internalValue)){
   setInternalValue(firstValue);
  }
 },[options,isControlled,internalValue,firstValue]);

 useEffect(()=>{
  if(!open)return;
  const updatePosition=()=>{
   const rect=buttonRef.current?.getBoundingClientRect();
   if(rect)setPosition({top:rect.bottom+6,left:rect.left,width:rect.width});
  };
  updatePosition();
  const close=(event:MouseEvent)=>{
   const target=event.target as Node;
   if(!rootRef.current?.contains(target)&&!(target instanceof Element&&target.closest(".searchableSelectMenu")))setOpen(false);
  };
  document.addEventListener("mousedown",close);
  window.addEventListener("resize",updatePosition);
  window.addEventListener("scroll",updatePosition,true);
  return ()=>{document.removeEventListener("mousedown",close);window.removeEventListener("resize",updatePosition);window.removeEventListener("scroll",updatePosition,true)};
 },[open]);

 useEffect(()=>{if(open)setTimeout(()=>inputRef.current?.focus(),0)},[open]);

 const choose=(next:string)=>{
  if(!isControlled)setInternalValue(next);
  onChange?.({target:{value:next},currentTarget:{value:next}} as ChangeEvent<HTMLSelectElement>);
  setOpen(false);setQuery("");
 };

 return <div className={`searchableSelect ${className}`} ref={rootRef}>
  <input type="hidden" name={name} value={selectedValue} disabled={disabled}/>
  <button {...rest} ref={buttonRef} type="button" className="searchableSelectButton" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-required={required} onClick={()=>setOpen(current=>!current)}>
   <span className={!selected?"placeholder":""}>{selected?.label||placeholder||"اختر من القائمة"}</span><i>⌄</i>
  </button>
  {open&&typeof document!=="undefined"&&createPortal(<div className="searchableSelectMenu" style={{top:position.top,left:position.left,width:position.width}} dir="rtl">
   <div className="searchableSelectSearch"><span>⌕</span><input ref={inputRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder={searchPlaceholder}/></div>
   <div className="searchableSelectOptions" role="listbox">
    {filtered.map(option=><button type="button" role="option" aria-selected={option.value===selectedValue} className={option.value===selectedValue?"selected":""} disabled={option.disabled} key={option.value} onClick={()=>choose(option.value)}>{option.label}<span>{option.value===selectedValue?"✓":""}</span></button>)}
    {!filtered.length&&<p>لا توجد نتائج مطابقة</p>}
   </div>
  </div>,document.body)}
 </div>
}
