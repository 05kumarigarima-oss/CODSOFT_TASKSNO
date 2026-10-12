const STORAGE_KEY='pennywise_transactions_v1';
let transactions=loadTransactions(), deleteTarget=null;
const $=s=>document.querySelector(s);
const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function loadTransactions(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return []}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(transactions))}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function dateLabel(date){if(!date)return '';return new Date(date+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}
function selectedType(){return document.querySelector('input[name="type"]:checked').value}
function monthOf(t){return (t.date||'').slice(0,7)}
function totals(items){return items.reduce((acc,t)=>{acc[t.type]+=Number(t.amount);return acc},{income:0,expense:0})}
function visibleTransactions(){
 const q=$('#search').value.trim().toLowerCase(),type=$('#typeFilter').value,cat=$('#categoryFilter').value,month=$('#monthFilter').value;
 return transactions.filter(t=>(!month||monthOf(t)===month)&&(type==='all'||t.type===type)&&(cat==='all'||t.category===cat)&&(`${t.description} ${t.category} ${t.type}`.toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
}
function render(){
 const month=$('#monthFilter').value;
 const monthItems=transactions.filter(t=>!month||monthOf(t)===month),sum=totals(monthItems);
 $('#balance').textContent=money(sum.income-sum.expense);$('#income').textContent=money(sum.income);$('#expenses').textContent=money(sum.expense);
 const list=visibleTransactions();$('#transactionCount').textContent=`${list.length} ${list.length===1?'record':'records'}`;
 $('#transactions').innerHTML=list.map(t=>`<article class="transaction" data-id="${esc(t.id)}"><div class="transaction-icon ${esc(t.type)}">${t.type==='income'?'↗':'↘'}</div><div class="transaction-info"><strong>${esc(t.description)}</strong><small>${esc(t.category)} · ${esc(dateLabel(t.date))}</small></div><div class="transaction-amount ${esc(t.type)}">${t.type==='income'?'+':'−'}${money(Number(t.amount))}</div><div class="transaction-actions"><button data-action="edit" aria-label="Edit transaction" title="Edit">✎</button><button data-action="delete" aria-label="Delete transaction" title="Delete">⌫</button></div></article>`).join('');
 $('#empty').classList.toggle('show',list.length===0);
}
$('#today').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
const now=new Date();$('#date').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;$('#monthFilter').value=$('#date').value.slice(0,7);
$('#transactionForm').addEventListener('submit',event=>{
 event.preventDefault();const amount=Number($('#amount').value),description=$('#description').value.trim(),date=$('#date').value,idValue=$('#transactionId').value;
 $('#amountError').textContent=amount>0&&Number.isFinite(amount)?'':'Enter an amount greater than zero.';
 $('#descriptionError').textContent=description.length>=2?'':'Enter a description with at least 2 characters.';
 if(!(amount>0&&Number.isFinite(amount))||description.length<2||!date)return;
 const existing=transactions.find(t=>t.id===idValue);
 const transaction={id:idValue||id(),type:selectedType(),amount,description,category:$('#category').value,date,createdAt:existing?existing.createdAt:Date.now()};
 if(existing)transactions=transactions.map(t=>t.id===idValue?transaction:t);else transactions.push(transaction);
 save();resetForm();$('#monthFilter').value=date.slice(0,7);render();
});
function resetForm(){ $('#transactionForm').reset();$('#transactionId').value='';$('#formHeading').textContent='Add transaction';$('#saveButton').textContent='＋ Add transaction';$('#cancelEdit').hidden=true;$('#date').value=new Date().toISOString().slice(0,10);document.querySelector('input[name="type"][value="expense"]').checked=true;$('#amountError').textContent='';$('#descriptionError').textContent='';}
function editTransaction(t){
 $('#transactionId').value=t.id;$('#amount').value=t.amount;$('#description').value=t.description;$('#category').value=t.category;$('#date').value=t.date;document.querySelector(`input[name="type"][value="${t.type}"]`).checked=true;$('#formHeading').textContent='Edit transaction';$('#saveButton').textContent='Save changes';$('#cancelEdit').hidden=false;$('#amount').focus();window.scrollTo({top:0,behavior:'smooth'});
}
$('#cancelEdit').addEventListener('click',resetForm);
$('#transactions').addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return;const item=button.closest('[data-id]'),t=transactions.find(x=>x.id===item.dataset.id);if(!t)return;
 if(button.dataset.action==='edit')editTransaction(t);
 if(button.dataset.action==='delete'){deleteTarget=t.id;$('#confirmDialog').showModal()}
});
$('#confirmDelete').addEventListener('click',()=>{if(deleteTarget){transactions=transactions.filter(t=>t.id!==deleteTarget);save();if($('#transactionId').value===deleteTarget)resetForm();deleteTarget=null;render()}$('#confirmDialog').close()});
$('#cancelDelete').addEventListener('click',()=>{deleteTarget=null;$('#confirmDialog').close()});
['#search','#typeFilter','#categoryFilter','#monthFilter'].forEach(selector=>$(selector).addEventListener(selector==='#search'?'input':'change',render));
$('#themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');const dark=document.body.classList.contains('dark');localStorage.setItem('pennywise_dark',dark?'1':'0');$('#themeToggle').textContent=dark?'☀':'☾'});
if(localStorage.getItem('pennywise_dark')==='1'){document.body.classList.add('dark');$('#themeToggle').textContent='☀'}
$('#exportCsv').addEventListener('click',()=>{
 const rows=[['Date','Type','Description','Category','Amount'],...visibleTransactions().map(t=>[t.date,t.type,t.description,t.category,t.amount])];
 const csv=rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='pennywise-transactions.csv';a.click();URL.revokeObjectURL(url);
});
render();
