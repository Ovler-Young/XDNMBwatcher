(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{853:function(t,e,r){"use strict";r.r(e),r.d(e,{default:function(){return C}});var n=r(4637),s=r(2205),i=r.n(s),o=r(606),c=r(307),a=r(2),l=r(9496),d=r(607),u=r(6600),h=r(2210),x=r(152),f=r(2248),m=r(3974),g=r(5318),p=r(4355),j=r(8399),b=r(7420),w=r(6124),v=r(3266),k=(0,a.cn)(""),y=(0,a.cn)(""),T=(0,a.cn)("");function C(){var t=(0,h.If)(),e=t.colorMode,r=(t.toggleColorMode,(0,x.pm)()),s=(0,a.KO)(y),C=(0,c.Z)(s,2),z=(C[0],C[1]),S=(0,a.KO)(T),E=(0,c.Z)(S,2),O=(E[0],E[1]),W=l.useState(!1),A=(0,c.Z)(W,2),D=A[0],Z=A[1],J=(0,a.KO)(k),_=(0,c.Z)(J,2),N=_[0],M=_[1],U=(0,a.KO)(k),R=(0,c.Z)(U,2),P=R[0],I=R[1],G=(0,u.ZP)("https://rssandmore.gcy.workers.dev/1/feeds").data;l.useEffect((function(){z(location.host),O(location.pathname.substring(1)),Z(!0)}),[z,O]);var L=function(){var t=(0,o.Z)(i().mark((function t(e){var n,s;return i().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e.preventDefault(),console.log(e),n=e.currentTarget.getAttribute("id"),s="https://www.nmbxd1.com/t/".concat(n),t.next=6,fetch("https://rssandmore.gcy.workers.dev/1/deleteitem",{method:"post",body:JSON.stringify({url:s})}).then((function(t){return t.json()})).then((function(t){0!=t.status?r({position:"bottom-right",title:"Error!",description:t.message,status:"error",duration:3e3,isClosable:!0}):r({position:"bottom-right",title:"Delete succeed!",description:t.message,status:"success",duration:1e3,isClosable:!0})}));case 6:t.sent,(0,u.JG)("https://rssandmore.gcy.workers.dev/1/feeds");case 8:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}(),F=function(){var t=(0,o.Z)(i().mark((function t(e){return i().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return console.log(N),t.next=3,fetch("https://rssandmore.gcy.workers.dev/1/subitem",{method:"post",body:JSON.stringify({url:N})}).then((function(t){return t.json()})).then((function(t){0!=t.status?r({position:"bottom-right",title:"Error!",description:t.message,status:"error",duration:3e3,isClosable:!0}):r({position:"bottom-right",title:"Success!",description:t.message,status:"success",duration:1e3,isClosable:!0})}));case 3:t.sent,(0,u.JG)("https://rssandmore.gcy.workers.dev/1/feeds");case 5:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}(),H=function(){var t=(0,o.Z)(i().mark((function t(e){return i().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e.preventDefault(),console.log(e.currentTarget.getAttribute("state")),t.next=4,fetch("https://rssandmore.gcy.workers.dev/1/active",{method:"POST",body:JSON.stringify({url:e.currentTarget.getAttribute("url"),state:"on"!==e.currentTarget.getAttribute("state")})}).then((function(t){return t.json()})).then((function(t){0!=t.status?r({position:"bottom-right",title:"Error!",description:t.message,status:"error",duration:3e3,isClosable:!0}):r({position:"bottom-right",title:"succeed!",description:t.message,status:"success",duration:1e3,isClosable:!0})}));case 4:t.sent,(0,u.JG)("https://rssandmore.gcy.workers.dev/1/feeds");case 6:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}(),K=function(){var t=(0,o.Z)(i().mark((function t(e){var n;return i().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return n=e.currentTarget.getAttribute("url"),t.next=3,fetch("https://rssandmore.gcy.workers.dev/1/title",{method:"post",body:JSON.stringify({url:n,title:P})}).then((function(t){return t.json()})).then((function(t){0!=t.status?r({position:"bottom-right",title:"Error!",description:t.message,status:"error",duration:3e3,isClosable:!0}):r({position:"bottom-right",title:"Edit succeed!",description:t.message,status:"success",duration:1e3,isClosable:!0})}));case 3:t.sent,(0,u.JG)("https://rssandmore.gcy.workers.dev/1/feeds");case 5:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}(),X=function(){var t=(0,o.Z)(i().mark((function t(e){return i().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e.preventDefault(),console.log(e.currentTarget.getAttribute("state")),console.log(e.currentTarget.getAttribute("jump")),window.open(e.currentTarget.getAttribute("jump")),t.next=6,fetch("https://rssandmore.gcy.workers.dev/1/unread",{method:"POST",body:JSON.stringify({url:e.currentTarget.getAttribute("url")})}).then((function(t){return t.json()})).then((function(t){0!=t.status?r({position:"bottom-right",title:"Error!",description:t.message,status:"error",duration:3e3,isClosable:!0}):r({position:"bottom-right",title:"succeed!",description:t.message,status:"success",duration:1e3,isClosable:!0})}));case 6:t.sent,(0,u.JG)("https://rssandmore.gcy.workers.dev/1/feeds");case 8:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}(),B=function(){var t=(0,o.Z)(i().mark((function t(e){return i().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:e.preventDefault(),console.log(e.currentTarget.getAttribute("url")),window.open(e.currentTarget.getAttribute("url"));case 3:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}();return G&&D?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(f.xu,{w:"md",maxW:"100%",mx:"auto",my:"10",children:(0,n.jsxs)(f.xu,{children:[(0,n.jsx)(f.xv,{fontSize:"4xl",fontWeight:"bold",align:"center",children:"X\u5c9b\u533f\u540d\u7248 \u4e32\u76d1\u89c6\u5668"}),(0,n.jsx)(f.xv,{align:"center",fontSize:"2xl",fontWeight:"bold",children:"Subscribe!"}),(0,n.jsxs)("flex",{children:[(0,n.jsx)(f.xu,{w:"md",maxW:"100%",mx:"auto",my:"3",align:"center",children:(0,n.jsx)(f.xv,{fontSize:"md",fontWeight:"light",align:"center",children:"\u5728\u4e0b\u65b9\u8f93\u5165\u4e32\u53f7"})}),(0,n.jsx)(f.xu,{size:"sm",align:"center",children:(0,n.jsxs)(g.ET,{size:"md",onChange:function(t){return M(t)},onComplete:function(t){return M(t)&F()},PinInput:!0,align:"center",children:[(0,n.jsx)(g.xj,{}),(0,n.jsx)(g.xj,{}),(0,n.jsx)(g.xj,{}),(0,n.jsx)(g.xj,{}),(0,n.jsx)(g.xj,{}),(0,n.jsx)(g.xj,{}),(0,n.jsx)(g.xj,{}),(0,n.jsx)(g.xj,{})]})})]}),(0,n.jsxs)(f.xv,{align:"center",fontSize:"2xl",children:[G.length," items"]}),(0,n.jsx)(f.M5,{width:"md",children:(0,n.jsxs)(p.iA,{size:"xs",align:"center",w:"md",maxW:"100%",mx:"auto",my:"3",variant:"simple",children:[(0,n.jsx)(p.hr,{children:(0,n.jsxs)(p.Tr,{children:[(0,n.jsx)(j.u,{label:"Unread",placement:"auto",children:(0,n.jsx)(p.Th,{children:"URD"})}),(0,n.jsx)(p.Th,{children:"title"}),(0,n.jsx)(j.u,{label:"active",placement:"auto",children:(0,n.jsx)(p.Th,{children:"act"})}),(0,n.jsx)(j.u,{label:"Original Writer",placement:"auto",children:(0,n.jsx)(p.Th,{children:"PO"})}),(0,n.jsx)(p.Th,{children:"ID"}),(0,n.jsx)(p.Th,{children:"UPD"}),(0,n.jsx)(j.u,{label:"FIELD",placement:"auto",children:(0,n.jsx)(p.Th,{children:"FLD"})}),(0,n.jsx)(j.u,{label:"Delete",placement:"auto",children:(0,n.jsx)(p.Th,{children:"DEL"})})]})}),(0,n.jsx)(p.p3,{children:G.map((function(t){return(0,n.jsxs)(p.Tr,{children:[(0,n.jsx)(p.Td,{children:t.unread?(0,n.jsx)(j.u,{label:"Mark as read!",placement:"auto",children:(0,n.jsxs)(b.zx,{id:t.id,url:t.url,state:t.unread?"on":"off",variant:"ghost",isChecked:t.unread,jump:t.unread?"https://www.nmbxd1.com/m/t/".concat(t.id,"?page=").concat(Math.floor((t.LastRead-1)/9+1)):"https://www.nmbxd1.com/m/t/".concat(t.id,"?page=").concat(Math.floor((t.ReplyCountAll-1)/9+1)),onClick:X,children:[" ",t.unread]})}):(0,n.jsx)(j.u,{label:"No action!",placement:"auto",children:(0,n.jsxs)(b.zx,{id:t.id,url:t.unread?"https://www.nmbxd1.com/m/t/".concat(t.id,"?page=").concat(Math.floor((t.LastRead-1)/9+1)):"https://www.nmbxd1.com/m/t/".concat(t.id,"?page=").concat(Math.floor((t.ReplyCountAll-1)/9+1)),variant:"ghost",isChecked:t.unread,onClick:B,children:[" ",t.unread]})})}),(0,n.jsx)(p.Td,{maxWidth:"14em",overflowX:"scroll",children:(0,n.jsxs)(w.J2,{placement:"top-start",bg:"black",size:"xs",children:[(0,n.jsx)(w.xo,{children:(0,n.jsx)(b.zx,{variant:"ghost",size:"xs",fontSize:"s",fontWeight:"light",children:t.title})}),(0,n.jsxs)(w.yk,{boxShadow:"black",bg:"light"===e?"white":"black",children:[(0,n.jsx)(w.Yt,{fontWeight:"semibold",children:"\u91cd\u547d\u540d\u6807\u9898\uff01"}),(0,n.jsx)(w.QH,{}),(0,n.jsx)(w.us,{}),(0,n.jsxs)(w.b,{align:"center",children:[(0,n.jsx)(f.xv,{children:"\u8bf7\u91cd\u65b0\u8f93\u5165"}),(0,n.jsx)(f.xv,{fontSize:"xl",fontWeight:"bold",align:"center",children:t.title}),(0,n.jsx)(f.xv,{children:"\u7684\u6807\u9898\uff01"}),(0,n.jsxs)(v.BZ,{size:"sm",children:[(0,n.jsx)(v.II,{focusBorderColor:"light"===e?"black":"white",pr:"2rem",placeholder:"\u91cd\u65b0\u8f93\u5165\u6807\u9898",value:P,variant:"outline",onChange:function(t){return I(t.target.value)}}),(0,n.jsx)(v.xH,{width:"3.5rem",mx:"0.5",children:(0,n.jsx)(b.zx,{h:"1.75rem",size:"xs",onClick:K,variant:"outline",colorScheme:"black",id:t.id,url:t.url,children:"Change"})})]})]})]})]})}),(0,n.jsx)(p.Td,{children:(0,n.jsx)(j.u,{label:"Click to change!",placement:"auto",children:(0,n.jsx)(b.zx,{id:t.id,state:t.active?"on":"off",variant:"ghost",isChecked:t.active,onClick:H,url:t.url,children:(0,n.jsx)(f.xu,{w:"2",h:"2",border:"1px",bg:t.active?"green.500":"red.500",borderRadius:"full"})})})}),(0,n.jsx)(p.Td,{children:(0,n.jsx)(f.rU,{href:t.url,fontSize:"s",fontWeight:"light",children:t.po.substring(0,3)})}),(0,n.jsx)(p.Td,{children:(0,n.jsx)(b.zx,{id:t.id,url:t.unread?"https://www.nmbxd1.com/t/".concat(t.id,"?page=").concat(Math.floor((t.LastRead-1)/19+1)):"https://www.nmbxd1.com/t/".concat(t.id,"?page=").concat(Math.floor((t.ReplyCountAll-1)/19+1)),variant:"ghost",fontWeight:"light",herf:t.url,onClick:B,size:"xs",fontSize:"md",children:t.id})}),(0,n.jsxs)(p.Td,{fontSize:"sm",children:[t.lastUpdateTime.substring(5,7),"/",t.lastUpdateTime.substring(8,10),"|",t.lastUpdateTime.substring(13,15),":",t.lastUpdateTime.substring(16,18)]}),(0,n.jsx)(p.Td,{children:(0,n.jsx)(f.rU,{href:19===t.fid?"https://www.nmbxd1.com/f/\u5c0f\u8bf4":81===t.fid?"https://www.nmbxd1.com/f/\u602a\u8c08":111===t.fid?"https://www.nmbxd1.com/f/\u8dd1\u56e2":4===t.fid?"https://www.nmbxd1.com/f/\u7efc\u5408\u72481":20===t.fid?"https://www.nmbxd1.com/f/\u90fd\u5e02\u602a\u8c08":t.fid,fontSize:"s",fontWeight:"light",children:19===t.fid?"\u5c0f\u8bf4":81===t.fid?"\u602a\u8c08":111===t.fid?"\u8dd1\u56e2":4===t.fid?"\u4e2d\u533b":20===t.fid?"\u602a\u8c08":t.fid})}),(0,n.jsx)(p.Td,{children:(0,n.jsxs)(w.J2,{placement:"top-start",colorScheme:"black",children:[(0,n.jsx)(w.xo,{children:(0,n.jsx)(b.zx,{variant:"ghost",size:"xs",children:"Delete"})}),(0,n.jsxs)(w.yk,{boxShadow:"black",bg:"light"===e?"white":"black",children:[(0,n.jsx)(w.Yt,{fontWeight:"semibold",children:"Be careful!"}),(0,n.jsx)(w.QH,{}),(0,n.jsx)(w.us,{}),(0,n.jsxs)(w.b,{align:"center",children:[(0,n.jsx)(f.xv,{children:"Delete "+t.title+" ?"}),(0,n.jsx)(b.zx,{my:"2",variant:"outline",size:"sm",borderColor:"black",id:t.id,onClick:L,children:"Confirm!"})]})]})]})})]},t.url)}))})]})})]})}),(0,n.jsx)("footer",{children:(0,n.jsx)(f.kC,{mt:"100px",borderTop:"1px",mx:"auto",justify:"flex-end",px:8,py:4,width:"100%",maxWidth:"md",children:(0,n.jsx)(f.rU,{href:"https://github.com/Ovler-Young/rssandmore",isExternal:!0,children:(0,n.jsx)(b.zx,{variant:"ghost",size:"sm",rightIcon:(0,n.jsx)(d.RrF,{}),children:"GitHub"})})})})]}):(0,n.jsx)(f.xu,{w:"100%",align:"center",children:(0,n.jsx)(m.$,{size:"xl",my:"80"})})}},4634:function(t,e,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return r(853)}])}},function(t){t.O(0,[230,53,888,179],(function(){return e=4634,t(t.s=e);var e}));var e=t.O();_N_E=e}]);