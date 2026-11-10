"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Image from 'next/image';
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
image:string | null;
inventory:number;
sizes:S[];
toppings:T[]};
type L={key:string;
product:P;
size:S;
toppings:T[];
quantity:number};
type PaymentMethod = 'MOCK_WALLET' | 'MOCK_CARD';
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalCents: number;
  discountCents: number;
  items: { id: string; productName: string; size: string; toppings: string[]; quantity: number }[];
  statusHistory: { id: string; status: string; changedAt: string }[];
};
type PaymentResult = { payment: { status: 'SUCCEEDED' | 'FAILED' }; order: Order };
type PaymentAttempt = { id: string; method: PaymentMethod; key: string; simulate: 'success' | 'fail' };
type CheckoutDraft = { id: string; cart: L[]; promotion: string };

function createPaymentKey() {
  const random = crypto.getRandomValues(new Uint32Array(4));
  return Array.from(random, part => part.toString(16).padStart(8, '0')).join('');
}

const money=(n:number)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
export default function Home(){const[products,setProducts]=useState<P[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[cart,setCart]=useState<L[]>([]),[selection,setSelection]=useState<P|null>(null),[size,setSize]=useState<S|null>(null),[tops,setTops]=useState<T[]>([]),[category,setCategory]=useState('Tất cả'),[search,setSearch]=useState(''),[cartOpen,setCartOpen]=useState(false),[auth,setAuth]=useState<'login'|'register'|null>(null),[user,setUser]=useState<any>(null),[orders,setOrders]=useState<Order[]>([]),[notice,setNotice]=useState(''),[simulateFail,setSimulateFail]=useState(false),[paymentMethod,setPaymentMethod]=useState<'MOCK_WALLET'|'MOCK_CARD'>('MOCK_WALLET');
const [ordersOpen, setOrdersOpen] = useState(false);
const [loyaltyPoints, setLoyaltyPoints] = useState(0);
const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
const [confirmation, setConfirmation] = useState<Order | null>(null);
const [checkoutOpen, setCheckoutOpen] = useState(false);
const [checkoutError, setCheckoutError] = useState('');
const [paying, setPaying] = useState(false);
const paymentLock = useRef(false);
const checkoutDraft = useRef<CheckoutDraft | null>(null);
const paymentAttempts = useRef(new Map<string, PaymentAttempt>());
const [promotionCode, setPromotionCode] = useState('');
const loadMenu = useCallback(async (signal?: AbortSignal) => {
  try {
    const menu = await api<P[]>('/products', { signal });
    if (!signal?.aborted) setProducts(menu);
  } catch (error) {
    if (!signal?.aborted) setError((error as Error).message);
  } finally {
    if (!signal?.aborted) setLoading(false);
  }
}, []);
function retryMenu() {
  setError('');
  setLoading(true);
  void loadMenu();
}
useEffect(() => {
  const controller = new AbortController();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  queueMicrotask(() => {
    if (controller.signal.aborted) return;
    void loadMenu(controller.signal);
    const storedUser = localStorage.getItem('user');
    if (localStorage.getItem('token') && storedUser) setUser(JSON.parse(storedUser));
  });
  return () => controller.abort();
}, [loadMenu]);
const categories=['Tất cả',...Array.from(new Set(products.map(x=>x.category)))],visible=useMemo(()=>products.filter(x=>(category==='Tất cả'||x.category===category)&&x.name.toLowerCase().includes(search.toLowerCase())),[products,category,search]),total=cart.reduce((n,x)=>n+(x.size.priceCents+x.toppings.reduce((a,t)=>a+t.priceCents,0))*x.quantity,0);
async function open(p: P) {
  try {
    const product = await api<P>(`/products/${p.id}`);
    setSelection(product);
    setSize(product.sizes.find(option => option.name === 'M') ?? product.sizes[0] ?? null);
    setTops([]);
  } catch (e: any) {
    toast(e.message);
  }
}
function cartQuantity(productId: string) {
  return cart.reduce((quantity, line) => line.product.id === productId ? quantity + line.quantity : quantity, 0);
}
function add(){if(!selection||!size)return;
if (cartQuantity(selection.id) >= selection.inventory) {
  toast('Số lượng trong giỏ đã bằng số lượng còn lại.');
  return;
}
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
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}
async function checkout() {
  if (paymentLock.current || !cart.length) return;
  paymentLock.current = true;
  setPaying(true);
  setCheckoutError('');
  try {
    const promotion = promotionCode.trim().toUpperCase();
    let draft = checkoutDraft.current;
    if (!draft || draft.cart !== cart || draft.promotion !== promotion) {
      const order = await api<Order>('/orders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          items: cart.map(x => ({
            productId: x.product.id, size: x.size.name,
            toppings: x.toppings.map(t => t.name), quantity: x.quantity,
          })),
          promotionCode: promotion || undefined,
        }),
      });
      draft = { id: order.id, cart, promotion };
      checkoutDraft.current = draft;
    }
    const attempt = paymentAttempts.current.get(draft.id) ?? {
      id: draft.id, method: paymentMethod, key: createPaymentKey(),
      simulate: simulateFail ? 'fail' : 'success',
    };
    await payOrder(attempt);
  } catch (error) {
    setCheckoutError((error as Error).message);
  } finally {
    paymentLock.current = false;
    setPaying(false);
  }
}
function openCheckout() {
  if (!user) {
    setCartOpen(false);
    setAuth('login');
    return;
  }
  setCheckoutError('');
  setCheckoutOpen(true);
}
async function loadOrders() {
  try {
    const options = { headers: authHeaders() };
    const [history, loyalty] = await Promise.all([
      api<Order[]>('/orders/me', options),
      api<{ points: number }>('/orders/loyalty', options),
    ]);
    setOrders(history);
    setLoyaltyPoints(loyalty.points);
    setOrdersOpen(true);
  } catch (e: any) {
    toast(e.message);
  }
}
async function trackOrder(id: string) {
  try {
    const order = await api<Order>(`/orders/${id}`, { headers: authHeaders() });
    setTrackedOrder(order);
    setOrders(current => current.map(entry => entry.id === id ? order : entry));
  } catch (e: any) {
    toast(e.message);
  }
}
async function payOrder(attempt: PaymentAttempt) {
  paymentAttempts.current.set(attempt.id, attempt);
  const result = await api<PaymentResult>('/payments', {
    method: 'POST',
    headers: { ...authHeaders(), 'Idempotency-Key': attempt.key },
    body: JSON.stringify({ orderId: attempt.id, method: attempt.method, simulate: attempt.simulate }),
  });
  paymentAttempts.current.delete(attempt.id);
  if (result.payment.status === 'FAILED') {
    setCheckoutError('Thanh toán thất bại. Bạn có thể chọn phương thức và thử lại.');
    if (!checkoutOpen) toast('Thanh toán thất bại.');
    return;
  }
  const draft = checkoutDraft.current;
  if (draft?.id === attempt.id) {
    setCart(current => current === draft.cart ? [] : current);
    if (cart === draft.cart && promotionCode.trim().toUpperCase() === draft.promotion) setPromotionCode('');
    checkoutDraft.current = null;
  }
  setCheckoutOpen(false);
  setCartOpen(false);
  setOrdersOpen(false);
  setTrackedOrder(null);
  setConfirmation(result.order);
  void loadMenu();
}
async function retryPayment(order: Order) {
  if (paymentLock.current) return;
  paymentLock.current = true;
  setPaying(true);
  try {
    const attempt = paymentAttempts.current.get(order.id) ?? {
      id: order.id, method: paymentMethod, key: createPaymentKey(), simulate: 'success' as const,
    };
    await payOrder(attempt);
  } catch (e: any) {
    toast(e.message);
  } finally {
    paymentLock.current = false;
    setPaying(false);
  }
}
async function cancelOrder(order: Order) {
  if (paymentLock.current) return;
  paymentLock.current = true;
  setPaying(true);
  try {
    await api(`/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    if (checkoutDraft.current?.id === order.id) checkoutDraft.current = null;
    paymentAttempts.current.delete(order.id);
    await trackOrder(order.id);
    void loadMenu();
  } catch (error) {
    toast((error as Error).message);
  } finally {
    paymentLock.current = false;
    setPaying(false);
  }
}
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
<a href="#story">Câu chuyện</a></nav>
<div className="top-actions">{user&&<button className="text-button" onClick={loadOrders}>Đơn hàng</button>}{user?<button className="profile" disabled={paying} onClick={()=>{localStorage.removeItem('token');
localStorage.removeItem('user');
setOrders([]);
setOrdersOpen(false);
paymentAttempts.current.clear();
checkoutDraft.current = null;
setTrackedOrder(null);
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
<button className={category===c?'active':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div>{loading?<div className="state">Đang chuẩn bị menu cho bạn…</div>:error?<div className="state error">{error}<button onClick={retryMenu}>Thử lại</button>
</div>:!visible.length?<div className="state">Chưa tìm thấy món phù hợp.</div>:<div className="product-grid">{visible.map((p,i)=>
<article className="product-card" key={p.id} onClick={()=>open(p)}>
<div className={`product-art art-${i%6}`}>
<span className="product-number">0{i+1}</span>
{p.image ? <Image className="drink-image" src={p.image} alt={p.name} width={130} height={130} unoptimized /> : <span className="drink-emoji">☕</span>}
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
<div className="modal-art">{selection.image ? <Image src={selection.image} alt={selection.name} width={125} height={125} unoptimized /> : '☕'}</div>
<div className="eyebrow">
<span/>{selection.category}</div>
<h2>{selection.name}</h2>
<p>{selection.description}</p>
<h4>Kích cỡ</h4>
<div className="option-row">{[...selection.sizes].sort((a, b) => a.priceCents - b.priceCents).map(s=>
<button className={size?.id===s.id?'chosen':''} onClick={()=>setSize(s)} key={s.id}>{s.name}<b>{money(s.priceCents)}</b>
</button>)}</div>
<h4>Thêm topping</h4>{selection.toppings.map(t=>
<label className="topping" key={t.id}>
<input type="checkbox" checked={tops.some(x=>x.id===t.id)} onChange={e=>setTops(v=>e.target.checked?[...v,t]:v.filter(x=>x.id!==t.id))}/>{t.name}<span>+{money(t.priceCents)}</span>
</label>)}<button className="primary full" disabled={!size || !selection.inventory} onClick={add}>Thêm vào giỏ · {money((size?.priceCents||0)+tops.reduce((a,t)=>a+t.priceCents,0))}</button>
</div>
</div>}
{((cartOpen&&!checkoutOpen)||auth)&&<div className="overlay" onClick={()=>{setCartOpen(false);
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
<button aria-label="Giảm số lượng" onClick={()=>setCart(c=>c.flatMap(v=>v.key!==x.key?[v]:v.quantity===1?[]:[{...v,quantity:v.quantity-1}]))}>−</button>{x.quantity}<button aria-label="Tăng số lượng" disabled={cartQuantity(x.product.id) >= x.product.inventory} onClick={()=>setCart(c=>c.map(v=>v.key===x.key?{...v,quantity:v.quantity+1}:v))}>+</button>
<button className="remove-line" onClick={() => setCart(current => current.filter(line => line.key !== x.key))}>Xóa</button>
</div>
</div>
<strong>{money((x.size.priceCents+x.toppings.reduce((a,t)=>a+t.priceCents,0))*x.quantity)}</strong>
</div>)}</div>}<div className="cart-total">
<span>Tạm tính</span>
<b>{money(total)}</b>
</div>
<button disabled={!cart.length || paying} className="primary full" onClick={openCheckout}>Thanh toán · {money(total)} →</button>
</>}</div>
</div>}
{checkoutOpen&&<div className="overlay">
<section className="modal side-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
<button className="text-button" disabled={paying} onClick={() => setCheckoutOpen(false)}>← Về giỏ hàng</button>
<h2 id="checkout-title">Thanh toán</h2>
<div className="cart-total"><span>Tạm tính trước ưu đãi</span><b>{money(total)}</b></div>
<fieldset className="payment-options" disabled={paying}>
<label>Mã ưu đãi <input value={promotionCode} onChange={e => setPromotionCode(e.target.value)} /></label>
<label>Phương thức <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as PaymentMethod)}>
<option value="MOCK_WALLET">Ví mô phỏng</option>
<option value="MOCK_CARD">Thẻ mô phỏng</option>
</select></label>
<label><input type="checkbox" checked={simulateFail} onChange={e=>setSimulateFail(e.target.checked)}/> Mô phỏng thất bại</label>
</fieldset>
{checkoutError&&<p role="alert" className="error">{checkoutError}</p>}
<button disabled={paying} className="primary full" onClick={checkout}>{paying ? 'Đang xử lý…' : 'Xác nhận thanh toán'}</button>
</section>
</div>}
{confirmation&&<div className="overlay">
<section className="modal side-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
<h2 id="confirmation-title">Đặt hàng thành công</h2>
<p>Mã đơn <strong>{confirmation.orderNumber}</strong></p>
<p>Trạng thái <strong>{confirmation.status}</strong></p>
{confirmation.discountCents > 0 && <p>Ưu đãi <strong>−{money(confirmation.discountCents)}</strong></p>}
<div className="cart-total"><span>Đã thanh toán</span><b>{money(confirmation.totalCents)}</b></div>
<button className="primary full" onClick={() => { setConfirmation(null); void loadOrders(); }}>Xem lịch sử đơn hàng</button>
<button className="text-button switch" onClick={() => setConfirmation(null)}>Tiếp tục xem menu</button>
</section>
</div>}
{ordersOpen&&<div className="overlay" onClick={()=>setOrdersOpen(false)}>
<div className="modal side-modal" onClick={e=>e.stopPropagation()}>
<button className="close" onClick={()=>setOrdersOpen(false)}>×</button>
<div className="eyebrow">
<span/> HÀNH TRÌNH ĐƠN HÀNG</div>
<h2>Đơn gần <em>đây.</em></h2>
<p>Điểm tích lũy <strong>{loyaltyPoints}</strong></p>
{!orders.length && <p>Bạn chưa có đơn hàng.</p>}
{orders.map(o=>
<div className="cart-line" key={o.id}>
<div>
<b>{o.orderNumber}</b>
<small>{new Date(o.createdAt).toLocaleString('vi-VN')} · {o.items.length} món</small>
<span className="status">{o.status}</span>
<button className="text-button" onClick={() => trackOrder(o.id)}>Theo dõi đơn</button>
{trackedOrder?.id === o.id && <>
  {trackedOrder.items.map(item => <p key={item.id}>
    {item.productName} · {item.size} × {item.quantity}
    {item.toppings.length > 0 && ` · ${item.toppings.join(', ')}`}
  </p>)}
  <ul>
  {trackedOrder.statusHistory.map(entry => <li key={entry.id}>
    {entry.status} · {new Date(entry.changedAt).toLocaleString('vi-VN')}
  </li>)}
</ul></>}
{['PENDING', 'PAYMENT_FAILED'].includes(o.status) &&
  <div>
    <button disabled={paying} onClick={() => retryPayment(o)}>Thử thanh toán lại</button>
    <button disabled={paying} onClick={() => cancelOrder(o)}>Hủy đơn</button>
  </div>}
</div>
<strong>{money(o.totalCents)}</strong>
</div>)}</div>
</div>}</main>}
