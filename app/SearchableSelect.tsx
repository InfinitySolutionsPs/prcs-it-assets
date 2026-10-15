"use client";
import {Children,isValidElement,ReactNode,SelectHTMLAttributes,useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";

type SelectValueChange={target:{value:string};currentTarget:{value:string}};

type Props=Omit<SelectHTMLAttributes<HTMLSelectElement>,"onChange"|"multiple"|"size"> & {
 onChange?:(event:SelectValueChange)=>void;
 searchPlaceholder?:string;
 searchable?:boolean;
 placeholder?:string;
};

type SearchOption={value:string;label:string;disabled:boolean};

function nodeText(node:ReactNode):string{
 if(typeof node==="string"||typeof node==="number")return String(node);
 if(Array.isArray(node))return node.map(nodeText).join("");
 if(isValidElement<{children?:ReactNode}>(node))return nodeText(node.props.children);
 return "";
}

export default function SearchableSelect({children,name,value,defaultValue,onChange,disabled,required,placeholder,searchPlaceholder="اكتب للبحث...",searchable=true,className="",...rest}:Props){
 const options=useMemo<SearchOption[]>(()=>Children.toArray(children).flatMap(child=>{
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
 const [position,setPosition]=useState({top:8,left:8,width:220,maxHeight:320,optionsMaxHeight:250});
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
   if(!rect)return;
   const viewportPadding=8;
   const menuWidth=Math.min(Math.max(rect.width,searchable?220:140),window.innerWidth-viewportPadding*2);
   const left=Math.max(viewportPadding,Math.min(rect.left,window.innerWidth-menuWidth-viewportPadding));
   const visibleRows=Math.min(Math.max(filtered.length,1),7);
   const searchHeight=searchable?48:0;
   const desiredHeight=Math.min(360,16+searchHeight+visibleRows*39);
   const spaceBelow=Math.max(0,window.innerHeight-rect.bottom-viewportPadding);
   const spaceAbove=Math.max(0,rect.top-viewportPadding);
   const opensAbove=spaceBelow<desiredHeight&&spaceAbove>spaceBelow;
   const availableSpace=opensAbove?spaceAbove:spaceBelow;
   const maxHeight=Math.max(80,Math.min(360,availableSpace||80));
   const renderedHeight=Math.min(desiredHeight,maxHeight);
   const top=opensAbove
    ? Math.max(viewportPadding,rect.top-renderedHeight-6)
    : Math.min(rect.bottom+6,Math.max(viewportPadding,window.innerHeight-renderedHeight-viewportPadding));
   setPosition({top,left,width:menuWidth,maxHeight,optionsMaxHeight:Math.max(48,maxHeight-(searchable?64:16))});
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
 },[open,filtered.length,searchable]);

 useEffect(()=>{if(open&&searchable)setTimeout(()=>inputRef.current?.focus(),0)},[open,searchable]);

 const choose=(next:string)=>{
  if(!isControlled)setInternalValue(next);
  onChange?.({target:{value:next},currentTarget:{value:next}});
  setOpen(false);setQuery("");
 };

 return <div className={`searchableSelect ${className}`} ref={rootRef}>
  <input type="hidden" name={name} value={selectedValue} disabled={disabled}/>
  <button ref={buttonRef} id={rest.id} type="button" className="searchableSelectButton" disabled={disabled} aria-label={rest["aria-label"]} aria-haspopup="listbox" aria-expanded={open} aria-required={required} onClick={()=>setOpen(current=>!current)}>
   <span className={!selected?"searchableSelectPlaceholder":""}>{selected?.label||placeholder||"اختر من القائمة"}</span><i>⌄</i>
  </button>
  {open&&typeof document!=="undefined"&&createPortal(<div className={`searchableSelectMenu ${searchable?"":"compact"}`} style={{top:position.top,left:position.left,width:position.width,maxHeight:position.maxHeight}} dir="rtl">
   {searchable&&<div className="searchableSelectSearch"><span>⌕</span><input ref={inputRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder={searchPlaceholder}/></div>}
   <div className="searchableSelectOptions" role="listbox" style={{maxHeight:position.optionsMaxHeight}}>
    {filtered.map(option=><button type="button" role="option" aria-selected={option.value===selectedValue} className={option.value===selectedValue?"selected":""} disabled={option.disabled} key={option.value} onClick={()=>choose(option.value)}>{option.label}<span>{option.value===selectedValue?"✓":""}</span></button>)}
    {!filtered.length&&<p>لا توجد نتائج مطابقة</p>}
   </div>
  </div>,document.body)}
 </div>
}
