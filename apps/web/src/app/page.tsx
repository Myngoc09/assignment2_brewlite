"use client";
import {useEffect,useMemo,useState} from 'react';
import {api} from '@/lib/api';
type S={id:string;
name:string;
priceCents:number};
type T={id:string;
name:string;
priceCents:number};
type P={id:string;
slug:string;
name:string;
description:string;
category:string;
inventory:number;
sizes:S[];
toppings:T[]};
type L={key:string;
product:P;
size:S;
toppings:T[];
quantity:number};
const money=(n:number)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
export default function Home(){const[products,setProducts]=useState<P[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[cart,setCart]=useState<L[]>([]),[selection,setSelection]=useState<P|null>(null),[size,setSize]=useState<S|null>(null),[tops,setTops]=useState<T[]>([]),[category,setCategory]=useState('Tất cả'),[search,setSearch]=useState(''),[cartOpen,setCartOpen]=useState(false),[auth,setAuth]=useState<'login'|'register'|null>(null),[user,setUser]=useState<any>(null),[orders,setOrders]=useState<any[]>([]),[notice,setNotice]=useState(''),[pendingPayment,setPendingPayment]=useState<any>(null),[simulateFail,setSimulateFail]=useState(false),[paymentMethod,setPaymentMethod]=useState<'MOCK_WALLET'|'MOCK_CARD'>('MOCK_WALLET');
useEffect(()=>{api<P[]>('/products').then(setProducts).catch(e=>setError(e.message)).finally(()=>setLoading(false));
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
const t=localStorage.getItem('token'),u=localStorage.getItem('user');
if(t&&u)setUser(JSON.parse(u))},[]);
const categories=['Tất cả',...Array.from(new Set(products.map(x=>x.category)))],visible=useMemo(()=>products.filter(x=>(category==='Tất cả'||x.category===category)&&x.name.toLowerCase().includes(search.toLowerCase())),[products,category,search]),total=cart.reduce((n,x)=>n+(x.size.priceCents+x.toppings.reduce((a,t)=>a+t.priceCents,0))*x.quantity,0);
function open(p:P){setSelection(p);
setSize(p.sizes[0]||null);
setTops([])}
function add(){if(!selection||!size)return;
const key=[selection.id,size.id,...tops.map(x=>x.id).sort()].join(':');
setCart(c=>c.some(x=>x.key===key)?c.map(x=>x.key===key?{...x,quantity:x.quantity+1}:x):[...c,{key,product:selection,size,toppings:tops,quantity:1}]);
setSelection(null);
toast('Đã thêm vào giỏ hàng')}
function toast(s:string){setNotice(s);
setTimeout(()=>setNotice(''),2500)}
async function authSubmit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();
const f=new FormData(e.currentTarget);
try{const d:any=await api(auth==='register'?'/auth/register':'/auth/login',{method:'POST',body:JSON.stringify({email:f.get('email'),password:f.get('password'),...(auth==='register'?{name:f.get('name')}: {})})});
localStorage.setItem('token',d.accessToken);
localStorage.setItem('user',JSON.stringify(d.user));
setUser(d.user);
setAuth(null);
toast('Xin chào '+d.user.name)}catch(e:any){toast(e.message)}}
async function checkout(){if(!user){setCartOpen(false);
setAuth('login');
return}try{const h={Authorization:`Bearer ${localStorage.getItem('token')}`};
const o:any=await api('/orders',{method:'POST',headers:h,body:JSON.stringify({items:cart.map(x=>({productId:x.product.id,size:x.size.name,toppings:x.toppings.map(t=>t.name),quantity:x.quantity}))})});
const r:any=await api(`/orders/${o.id}/pay`,{method:'POST',headers:{...h,'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({method:paymentMethod,simulate:simulateFail?'fail':'success'})});
if(r.payment.status==='SUCCEEDED'){toast(`Thanh toán thành công · ${r.order.orderNumber}`);
setCart([])}else{toast('Thanh toán thất bại. Đơn hàng được giữ để thử lại.');
setPendingPayment({...o,paymentMethod})}setCartOpen(false);
loadOrders()}catch(e:any){toast(e.message)}}
async function loadOrders(){try{setOrders(await api<any[]>('/orders/mine',{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}}))}catch(e:any){toast(e.message)}}
async function retryPayment(){if(!pendingPayment)return;
try{const r:any=await api(`/orders/${pendingPayment.id}/pay`,{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({method:pendingPayment.paymentMethod,simulate:'success'})});
if(r.payment.status==='SUCCEEDED'){setPendingPayment(null);
toast(`Thanh toán thành công · ${r.order.orderNumber}`);
loadOrders()}else toast('Thanh toán thất bại, hãy thử lại.')}catch(e:any){toast(e.message)}}
return <main>
<header className="topbar">
<a className="brand" href="#home">
<span className="brand-mark">b.</span>
<span>Brew<span className="light">Lite</span>
<small>BREWED FOR YOUR DAY</small>
</span>
</a>
<nav>
<a href="#menu">Thực đơn</a>
<a href="#story">Câu chuyện</a>{user&&<button className="text-button" onClick={loadOrders}>Đơn hàng</button>}</nav>
<div className="top-actions">{user?<button className="profile" onClick={()=>{localStorage.clear();
setUser(null)}}>Hi, {user.name.split(' ')[0]} · Thoát</button>:<button className="profile" onClick={()=>setAuth('login')}>Đăng nhập</button>}<button className="cart-button" onClick={()=>setCartOpen(true)}>Giỏ hàng <b>{cart.reduce((n,x)=>n+x.quantity,0)}</b>
</button>
</div>
</header>
<section className="hero" id="home">
<div className="hero-copy">
<div className="eyebrow">
<span/> NHẸ NHÀNG BẮT ĐẦU NGÀY MỚI</div>
<h1>Một chút<br/>
<em>thảnh thơi.</em>
<br/>Một ly thật ngon.</h1>
<p>Cà phê được rang tử tế, pha theo cách bạn thích. Niềm vui nhỏ xíu, dành riêng cho hôm nay.</p>
<a className="primary" href="#menu">Khám phá thực đơn <span>↗</span>
</a>
<div className="hero-note">
<span className="stars">★★★★★</span> Được yêu thích bởi những tâm hồn mê cà phê</div>
</div>
<div className="hero-art">
<div className="sun"/>
<div className="ring ring-one"/>
<div className="ring ring-two"/>
<div className="cup">
<div className="foam">✳</div>
<div className="cup-body">
<b>BL</b>
</div>
</div>
<div className="art-tag tag-top">SLOW MORNINGS<br/>
<b>GOOD COFFEE</b>
</div>
<div className="art-tag tag-bottom">RANG MỚI MỖI NGÀY<br/>
<b>Since 2024 · Sài Gòn</b>
</div>
<span className="leaf leaf-one">✦</span>
<span className="leaf leaf-two">✳</span>
</div>
<div className="hero-bottom">
<span>01 / 03</span>
<div/>
<span>Vị ngon từ điều giản dị</span>
</div>
</section>
<section className="menu-section" id="menu">
<div className="section-head">
<div>
<div className="eyebrow">
<span/> MENU CỦA CHÚNG MÌNH</div>
<h2>Chọn vị <em>bạn thương.</em>
</h2>
</div>
<label className="search">⌕ <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm thức uống..."/>
</label>
</div>
<div className="filters">{categories.map(c=>
<button className={category===c?'active':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div>{loading?<div className="state">Đang chuẩn bị menu cho bạn…</div>:error?<div className="state error">{error}<button onClick={()=>{setLoading(true);
api<P[]>('/products').then(setProducts).catch(e=>setError(e.message)).finally(()=>setLoading(false))}}>Thử lại</button>
</div>:!visible.length?<div className="state">Chưa tìm thấy món phù hợp.</div>:<div className="product-grid">{visible.map((p,i)=>
<article className="product-card" key={p.id} onClick={()=>open(p)}>
<div className={`product-art art-${i%6}`}>
<span className="product-number">0{i+1}</span>
<span className="drink-emoji">{['🍵','☕','🍊','🍓','🧋','🍑'][i%6]}</span>
<span className="card-plus">+</span>
<div className="product-art-label">BREWLITE<br/>FRESH DAILY</div>
</div>
<div className="product-info">
<div>
<span className="category-label">{p.category}</span>
<h3>{p.name}</h3>
</div>
<strong>{money(Math.min(...p.sizes.map(s=>s.priceCents)))}</strong>
</div>
<p className="description">{p.description}</p>
</article>)}</div>}</section>
<section className="story" id="story">
<div className="story-stamp">B<br/>L</div>
<div>
<div className="eyebrow">
<span/> CHẬM MỘT NHỊP</div>
<h2>Nguyên liệu tốt.<br/>
<em>Mỗi ngày nhẹ tênh.</em>
</h2>
<p>Tụi mình tin một ly ngon bắt đầu từ sự chăm chút. Hạt cà phê rang mới, trà thơm tuyển chọn và những công thức vừa vặn — để bạn có thể dành một khoảng dịu dàng cho riêng mình.</p>
</div>
<div className="story-aside">
<span>100%</span>
<p>HẠT RANG MỚI<br/>THEO TỪNG MẺ</p>
<span>01</span>
<p>LY NGON HÔM NAY</p>
</div>
</section>
<footer>
<a className="brand" href="#home">
<span className="brand-mark">b.</span>
<span>BrewLite</span>
</a>
<span>Rang tử tế · Pha bằng cả tấm lòng</span>
<span>© BrewLite 2026 · Sài Gòn</span>
</footer>
{notice&&<div className="toast">{notice}</div>}
{selection&&<div className="overlay" onClick={()=>setSelection(null)}>
<div className="modal product-modal" onClick={e=>e.stopPropagation()}>
<button className="close" onClick={()=>setSelection(null)}>×</button>
<div className="modal-art">{['🍵','☕','🍊','🍓'][products.indexOf(selection)%4]}</div>
<div className="eyebrow">
<span/>{selection.category}</div>
<h2>{selection.name}</h2>
<p>{selection.description}</p>
<h4>Kích cỡ</h4>
<div className="option-row">{selection.sizes.map(s=>
<button className={size?.id===s.id?'chosen':''} onClick={()=>setSize(s)} key={s.id}>{s.name}<b>{money(s.priceCents)}</b>
</button>)}</div>
<h4>Thêm topping</h4>{selection.toppings.map(t=>
<label className="topping" key={t.id}>
<input type="checkbox" checked={tops.some(x=>x.id===t.id)} onChange={e=>setTops(v=>e.target.checked?[...v,t]:v.filter(x=>x.id!==t.id))}/>{t.name}<span>+{money(t.priceCents)}</span>
</label>)}<button className="primary full" onClick={add}>Thêm vào giỏ · {money((size?.priceCents||0)+tops.reduce((a,t)=>a+t.priceCents,0))}</button>
</div>
</div>}
{(cartOpen||auth)&&<div className="overlay" onClick={()=>{setCartOpen(false);
setAuth(null)}}>
<div className="modal side-modal" onClick={e=>e.stopPropagation()}>
<button className="close" onClick={()=>{setCartOpen(false);
setAuth(null)}}>×</button>{auth?<>
<div className="eyebrow">
<span/> BREWLITE MEMBERS</div>
<h2>{auth==='login'?'Chào bạn trở lại.':'Bắt đầu điều thật ngon.'}</h2>
<form onSubmit={authSubmit}>{auth==='register'&&<label>Họ tên<input name="name" required/>
</label>}<label>Email<input name="email" type="email" required/>
</label>
<label>Mật khẩu<input name="password" type="password" minLength={8} required/>
</label>
<button className="primary full">{auth==='login'?'Đăng nhập':'Tạo tài khoản'}</button>
</form>
<button className="text-button switch" onClick={()=>setAuth(auth==='login'?'register':'login')}>{auth==='login'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập'}</button>
</>:<>
<div className="eyebrow">
<span/> MỘT CHÚT NGON LÀNH</div>
<h2>Giỏ hàng <em>của bạn.</em>
</h2>{!cart.length?<div className="state">Giỏ hàng còn trống. Ghé menu chọn món nhé.</div>:<div className="cart-lines">{cart.map(x=>
<div className="cart-line" key={x.key}>
<div>
<b>{x.product.name}</b>
<small>{x.size.name} · {x.toppings.map(t=>t.name).join(', ')||'Không topping'}</small>
<div className="quantity">
<button onClick={()=>setCart(c=>c.flatMap(v=>v.key!==x.key?[v]:v.quantity===1?[]:[{...v,quantity:v.quantity-1}]))}>−</button>{x.quantity}<button onClick={()=>setCart(c=>c.map(v=>v.key===x.key?{...v,quantity:v.quantity+1}:v))}>+</button>
</div>
</div>
<strong>{money((x.size.priceCents+x.toppings.reduce((a,t)=>a+t.priceCents,0))*x.quantity)}</strong>
</div>)}</div>}<div className="cart-total">
<span>Tạm tính</span>
<b>{money(total)}</b>
</div>
<label className="payment-note">Phương thức <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as any)}>
<option value="MOCK_WALLET">Ví mô phỏng</option>
<option value="MOCK_CARD">Thẻ mô phỏng</option>
</select> · <input type="checkbox" checked={simulateFail} onChange={e=>setSimulateFail(e.target.checked)}/> Mô phỏng thất bại</label>
<button disabled={!cart.length} className="primary full" onClick={checkout}>Đặt hàng · {money(total)} →</button>
</>}</div>
</div>}
{orders.length>0&&<div className="overlay" onClick={()=>setOrders([])}>
<div className="modal side-modal" onClick={e=>e.stopPropagation()}>
<button className="close" onClick={()=>setOrders([])}>×</button>
<div className="eyebrow">
<span/> HÀNH TRÌNH ĐƠN HÀNG</div>
<h2>Đơn gần <em>đây.</em>
</h2>{orders.map(o=>
<div className="cart-line" key={o.id}>
<div>
<b>{o.orderNumber}</b>
<small>{new Date(o.createdAt).toLocaleString('vi-VN')} · {o.items.length} món</small>
<span className="status">{o.status}</span>
</div>
<strong>{money(o.totalCents)}</strong>
</div>)}</div>
</div>}</main>}
