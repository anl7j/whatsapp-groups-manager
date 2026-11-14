import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import {
  Users,
  Building2,
  Folder,
  Calendar,
  Lock,
  Unlock,
  Download,
  Send,
  Copy,
  Plus,
  Search,
  RefreshCw,
  LogOut,
  Tag,
  Shield,
  Layers,
  BarChart3,
  Check,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'

interface UserState {
  id: string
  name: string
  phone: string
}

interface GroupTag {
  groupId: string
  groupName: string
  role: string
  isAdmin: boolean
}

interface Participant {
  id: string
  phone: string
  displayPhone?: string
  name?: string
  isLid?: boolean
  admin?: string | null
  isSuperAdmin?: boolean
  isAdmin?: boolean
  isMe?: boolean
}

interface GroupItem {
  id: string
  subject: string
  desc: string
  creation: string | null
  owner: string
  size: number
  participantsCount: number
  iAmAdmin: boolean
  myRole: string
  announce: boolean
  restrict: boolean
  isCommunity: boolean
  isCommunityAnnounce: boolean
  linkedParent: string | null
}

interface GroupDetails extends GroupItem {
  inviteCode?: string | null
  inviteUrl?: string | null
  participants: Participant[]
}

interface MemberItem {
  id: string
  phone: string
  displayPhone?: string
  name?: string
  isLid?: boolean
  isMe?: boolean
  groups: GroupTag[]
}

export default function App() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'connected'>('disconnected')
  const [user, setUser] = useState<UserState | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)

  const [activeMainTab, setActiveMainTab] = useState<'groups' | 'members'>('groups')
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [allMembers, setAllMembers] = useState<MemberItem[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Filters & Search
  const [groupFilter, setGroupFilter] = useState<'all' | 'groups-only' | 'community' | 'admin' | 'member'>('all')
  const [groupSearch, setGroupSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberTagFilter, setMemberTagFilter] = useState('')

  // Selected Group Dialog Modal
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null)
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [participantSearch, setParticipantSearch] = useState('')
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // Send Message Dialog Modal
  const [messageGroup, setMessageGroup] = useState<GroupItem | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Toast notice
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Socket.io initialization
  useEffect(() => {
    const socket = io()

    socket.on('status', (data) => {
      setStatus(data.status)
      setUser(data.user)
      setQrCode(data.qr)
    })

    socket.emit('request-status')

    return () => {
      socket.disconnect()
    }
  }, [])

  // Auto-fetch groups when connected
  useEffect(() => {
    if (status === 'connected') {
      fetchGroups()
    }
  }, [status])

  async function fetchGroups() {
    setLoadingGroups(true)
    try {
      const res = await fetch('/api/groups')
      const data = await res.json()
      if (data.success) {
        setGroups(data.groups || [])
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast('خطأ في جلب المجموعات: ' + err.message, 'error')
    } finally {
      setLoadingGroups(false)
    }
  }

  async function fetchAllMembers() {
    setLoadingMembers(true)
    try {
      const res = await fetch('/api/members')
      const data = await res.json()
      if (data.success) {
        setAllMembers(data.members || [])
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast('تعذر جلب دليل الأعضاء: ' + err.message, 'error')
    } finally {
      setLoadingMembers(false)
    }
  }

  async function openGroupDialog(group: GroupItem) {
    setSelectedGroup(group)
    setLoadingDetails(true)
    setGroupDetails(null)
    setParticipantSearch('')
    setNewMemberPhone('')

    try {
      const encodedId = encodeURIComponent(group.id)
      const res = await fetch(`/api/groups/${encodedId}`)
      const data = await res.json()
      if (data.success) {
        setGroupDetails(data.group)
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast('تعذر تحميل بيانات الأعضاء: ' + err.message, 'error')
    } finally {
      setLoadingDetails(false)
    }
  }

  async function handleToggleAnnounce(group: GroupItem, currentValue: boolean) {
    const newValue = !currentValue
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(group.id)}/setting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'announce', value: newValue })
      })
      const data = await res.json()
      if (data.success) {
        showToast(newValue ? 'تم قفل الإرسال (المشرفين فقط)' : 'تم فتح الإرسال للجميع', 'success')
        // update local state
        setGroups(prev => prev.map(g => g.id === group.id ? { ...g, announce: newValue } : g))
        if (groupDetails && groupDetails.id === group.id) {
          setGroupDetails({ ...groupDetails, announce: newValue })
        }
      }
    } catch (err: any) {
      showToast('تعذر تغيير إعداد الإرسال: ' + err.message, 'error')
    }
  }

  async function handleCopyInvite(group: GroupItem) {
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(group.id)}/invite`)
      const data = await res.json()
      if (data.success && data.url) {
        await navigator.clipboard.writeText(data.url)
        showToast('تم نسخ رابط الدعوة إلى الحافظة بنجاح!', 'success')
      } else {
        throw new Error(data.error || 'لا تملك صلاحية استخراج الرابط')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  async function handleParticipantAction(participantId: string, action: 'remove' | 'promote' | 'demote') {
    if (!selectedGroup) return
    const labels = {
      remove: 'طرد هذا العضو',
      promote: 'ترقية هذا العضو لمشرف',
      demote: 'خفض رتبة هذا المشرف'
    }
    if (!confirm(`هل أنت متأكد من ${labels[action]}؟`)) return

    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(selectedGroup.id)}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: [participantId], action })
      })
      const data = await res.json()
      if (data.success) {
        showToast('تم تنفيذ الإجراء بنجاح', 'success')
        openGroupDialog(selectedGroup)
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast('فشل تنفيذ الإجراء: ' + err.message, 'error')
    }
  }

  async function handleAddMember() {
    if (!selectedGroup || !newMemberPhone.trim()) return
    setAddingMember(true)
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(selectedGroup.id)}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: [newMemberPhone.trim()], action: 'add' })
      })
      const data = await res.json()
      if (data.success) {
        showToast('تمت إضافة العضو بنجاح', 'success')
        setNewMemberPhone('')
        openGroupDialog(selectedGroup)
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast('فشل إضافة العضو: ' + err.message, 'error')
    } finally {
      setAddingMember(false)
    }
  }

  async function handleSendMessage() {
    if (!messageGroup || !messageText.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(messageGroup.id)}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim() })
      })
      const data = await res.json()
      if (data.success) {
        showToast('تم إرسال الرسالة إلى المجموعة بنجاح!', 'success')
        setMessageGroup(null)
        setMessageText('')
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      showToast('فشل إرسال الرسالة: ' + err.message, 'error')
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleLogout() {
    if (!confirm('هل أنت متأكد من رغبتك في تسجيل الخروج وفصل الحساب؟')) return
    try {
      await fetch('/api/logout', { method: 'POST' })
      showToast('تم تسجيل الخروج بنجاح', 'success')
    } catch (err: any) {
      showToast('فشل تسجيل الخروج: ' + err.message, 'error')
    }
  }

  // Filtered lists
  const communitiesCount = groups.filter(g => g.isCommunity || g.isCommunityAnnounce || g.linkedParent).length
  const regularGroupsCount = groups.length - communitiesCount
  const adminCount = groups.filter(g => g.iAmAdmin).length
  const memberCount = groups.filter(g => !g.iAmAdmin).length
  const totalReach = groups.reduce((acc, g) => acc + (g.size || 0), 0)

  let filteredGroups = groups
  if (groupFilter === 'groups-only') {
    filteredGroups = filteredGroups.filter(g => !g.isCommunity && !g.isCommunityAnnounce && !g.linkedParent)
  } else if (groupFilter === 'community') {
    filteredGroups = filteredGroups.filter(g => g.isCommunity || g.isCommunityAnnounce || g.linkedParent)
  } else if (groupFilter === 'admin') {
    filteredGroups = filteredGroups.filter(g => g.iAmAdmin)
  } else if (groupFilter === 'member') {
    filteredGroups = filteredGroups.filter(g => !g.iAmAdmin)
  }

  if (groupSearch.trim()) {
    const q = groupSearch.toLowerCase().trim()
    filteredGroups = filteredGroups.filter(g => (g.subject || '').toLowerCase().includes(q) || (g.id || '').toLowerCase().includes(q))
  }

  // Filtered Directory members
  let filteredMembers = allMembers
  if (memberTagFilter) {
    filteredMembers = filteredMembers.filter(m => (m.groups || []).some(g => g.groupName === memberTagFilter))
  }
  if (memberSearch.trim()) {
    const q = memberSearch.toLowerCase().trim()
    filteredMembers = filteredMembers.filter(m => {
      const nameMatch = m.name && m.name.toLowerCase().includes(q)
      const phoneMatch = m.phone && m.phone.toLowerCase().includes(q)
      const tagMatch = (m.groups || []).some(g => g.groupName.toLowerCase().includes(q))
      return nameMatch || phoneMatch || tagMatch
    })
  }

  // Tags Set
  const allGroupTagsSet = Array.from(new Set(allMembers.flatMap(m => (m.groups || []).map(g => g.groupName)))).sort()

  // Filtered Participants in Modal
  let modalParticipants = groupDetails?.participants || []
  if (participantSearch.trim()) {
    const q = participantSearch.toLowerCase().trim()
    modalParticipants = modalParticipants.filter(p => {
      return (p.name && p.name.toLowerCase().includes(q)) || (p.phone && p.phone.includes(q))
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-6 z-50 rounded-lg border px-4 py-3 shadow-lg flex items-center gap-2 text-sm bg-card transition-all ${
          toast.type === 'success' ? 'border-primary text-primary' : toast.type === 'error' ? 'border-destructive text-destructive' : 'border-blue-500 text-blue-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Navbar */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow-sm flex items-center justify-center border border-border">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">منصة إدارة المجموعات والمجتمعات</h1>
              <p className="text-xs text-muted-foreground">WhatsApp Groups & Communities Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Tabs */}
            <Tabs value={activeMainTab} onValueChange={(val: any) => {
              setActiveMainTab(val)
              if (val === 'members' && allMembers.length === 0) {
                fetchAllMembers()
              }
            }}>
              <TabsList className="bg-secondary/60">
                <TabsTrigger value="groups" className="text-xs">
                  <Folder className="w-3.5 h-3.5 ml-1.5" />
                  المجموعات والمجتمعات
                </TabsTrigger>
                <TabsTrigger value="members" className="text-xs">
                  <Tag className="w-3.5 h-3.5 ml-1.5" />
                  دليل الأعضاء والوسوم
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Connection Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant={status === 'connected' ? 'default' : 'destructive'} className="font-medium text-xs">
                <span className={`w-2 h-2 rounded-full mr-1.5 ${status === 'connected' ? 'bg-emerald-300 animate-pulse' : 'bg-red-300'}`} />
                {status === 'connected' ? 'متصل بنجاح' : status === 'qr' ? 'بانتظار مسح الرمز' : 'غير متصل'}
              </Badge>

              {user && (
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border">
                  +{user.phone}
                </span>
              )}

              {status === 'connected' && (
                <Button variant="ghost" size="icon" onClick={handleLogout} title="تسجيل الخروج" className="text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={() => {
                if (activeMainTab === 'groups') fetchGroups()
                else fetchAllMembers()
                showToast('جاري تحديث البيانات...', 'info')
              }}>
                <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
                تحديث
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-4 py-8 flex-1 flex flex-col gap-6">
        {/* QR Code Banner (If not logged in) */}
        {status !== 'connected' && (
          <Card className="border-border bg-gradient-to-r from-card to-secondary/30">
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col gap-4 max-w-xl">
                <h2 className="text-xl font-bold tracking-tight">ربط حساب الواتساب</h2>
                <p className="text-sm text-muted-foreground">امسح رمز الاستجابة السريعة (QR Code) باستخدام هاتفك لبدء إدارة مجموعاتك ومجتمعاتك:</p>
                <ol className="text-sm text-foreground/90 space-y-2 list-decimal list-inside pr-2">
                  <li>افتح تطبيق <strong>واتساب</strong> على هاتفك.</li>
                  <li>اضغط على <strong>القائمة</strong> أو <strong>الإعدادات</strong> 👈 <strong>الأجهزة المرتبطة</strong>.</li>
                  <li>اضغط على <strong>ربط جهاز</strong> ووجّه الكاميرا نحو الشاشة.</li>
                </ol>
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>الرمز يتجدد تلقائياً عند انتهاء صلاحيته.</span>
                </div>
              </div>

              <div className="w-60 h-60 bg-white rounded-2xl p-4 shadow-xl flex items-center justify-center border border-border">
                {qrCode ? (
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span>جاري توليد الرمز...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Overview Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">إجمالي الكل</p>
                <p className="text-2xl font-bold">{groups.length.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">المجموعات فقط</p>
                <p className="text-2xl font-bold">{regularGroupsCount.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">المجتمعات</p>
                <p className="text-2xl font-bold">{communitiesCount.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">إجمالي الأعضاء</p>
                <p className="text-2xl font-bold">{totalReach.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* View 1: Groups & Communities Section */}
        {activeMainTab === 'groups' && (
          <Card className="border-border">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">المجموعات والمجتمعات</CardTitle>
                  <Badge variant="secondary" className="font-medium">
                    {groupFilter === 'groups-only' ? `${filteredGroups.length} مجموعة معروضة` :
                     groupFilter === 'community' ? `${filteredGroups.length} مجتمع معروض` :
                     `${filteredGroups.length} عنصر إجمالي`}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="ابحث باسم المجموعة أو المعرف..."
                      value={groupSearch}
                      onChange={e => setGroupSearch(e.target.value)}
                      className="pr-9 h-9 text-xs"
                    />
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex items-center bg-secondary/60 p-1 rounded-lg border border-border text-xs">
                    <button
                      onClick={() => setGroupFilter('all')}
                      className={`px-3 py-1 rounded-md transition-colors ${groupFilter === 'all' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      الكل ({groups.length})
                    </button>
                    <button
                      onClick={() => setGroupFilter('groups-only')}
                      className={`px-3 py-1 rounded-md transition-colors ${groupFilter === 'groups-only' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      المجموعات ({regularGroupsCount})
                    </button>
                    <button
                      onClick={() => setGroupFilter('community')}
                      className={`px-3 py-1 rounded-md transition-colors ${groupFilter === 'community' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      المجتمعات ({communitiesCount})
                    </button>
                    <button
                      onClick={() => setGroupFilter('admin')}
                      className={`px-3 py-1 rounded-md transition-colors ${groupFilter === 'admin' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      أنت مشرف ({adminCount})
                    </button>
                    <button
                      onClick={() => setGroupFilter('member')}
                      className={`px-3 py-1 rounded-md transition-colors ${groupFilter === 'member' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      أنت عضو ({memberCount})
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loadingGroups ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span>جاري جلب المجموعات من واتساب...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  لا توجد مجموعات مطابقة لبحثك.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGroups.map(group => {
                    const isComm = Boolean(group.isCommunity || group.isCommunityAnnounce || group.linkedParent)
                    return (
                      <Card key={group.id} className="bg-secondary/40 border-border hover:border-border/80 transition-all flex flex-col justify-between">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-sm leading-snug line-clamp-2" title={group.subject}>
                              {group.subject}
                            </h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isComm ? (
                                <Badge variant="secondary" className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px]">
                                  <Building2 className="w-3 h-3 ml-1" />
                                  مجتمع
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                                  <Folder className="w-3 h-3 ml-1" />
                                  مجموعة
                                </Badge>
                              )}
                              {group.iAmAdmin ? (
                                <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                                  <Shield className="w-3 h-3 ml-1" />
                                  مشرف
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  عضو
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-2 text-xs text-muted-foreground pb-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            <span>الأعضاء:</span>
                            <strong className="text-foreground">{group.size || group.participantsCount} عضو</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>تاريخ الإنشاء:</span>
                            <span>{group.creation ? new Date(group.creation).toLocaleDateString('ar-SA') : 'غير متوفر'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {group.announce ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                            <span>الإرسال:</span>
                            <span>{group.announce ? 'للمشرفين فقط' : 'مفتوح للجميع'}</span>
                          </div>
                        </CardContent>

                        <div className="p-4 pt-0 border-t border-border/50 flex flex-wrap gap-2 pt-3">
                          <Button size="sm" variant="default" onClick={() => openGroupDialog(group)} className="text-xs flex-1">
                            <Users className="w-3.5 h-3.5 ml-1.5" />
                            إدارة الأعضاء
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(`/api/groups/${encodeURIComponent(group.id)}/export-csv`, '_blank')} className="text-xs" title="تحميل ملف CSV بأرقام الأعضاء">
                            <Download className="w-3.5 h-3.5 ml-1" />
                            تصدير
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setMessageGroup(group)} className="text-xs" title="إرسال رسالة للمجموعة">
                            <Send className="w-3.5 h-3.5 ml-1" />
                            إرسال
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* View 2: Unified Members & Tags Directory Section */}
        {activeMainTab === 'members' && (
          <Card className="border-border">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    دليل الأعضاء والوسوم (Group Tags)
                  </CardTitle>
                  <Badge variant="secondary">{allMembers.length} عضو موحّد</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={() => window.open('/api/members/export-csv', '_blank')} className="text-xs">
                    <Download className="w-3.5 h-3.5 ml-1.5" />
                    تصدير الكل مع الوسوم (CSV)
                  </Button>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="بحث بالاسم، الرقم، أو وسم المجموعة..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="pr-9 h-9 text-xs"
                    />
                  </div>

                  <select
                    value={memberTagFilter}
                    onChange={e => setMemberTagFilter(e.target.value)}
                    className="h-9 px-3 text-xs bg-secondary border border-border rounded-md text-foreground outline-none cursor-pointer max-w-[200px]"
                  >
                    <option value="">جميع وسوم المجموعات (الكل)</option>
                    {allGroupTagsSet.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loadingMembers ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span>جاري تجميع الأعضاء والوسوم من كافة المجموعات...</span>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-secondary/40">
                      <TableRow>
                        <TableHead className="w-1/4">الاسم</TableHead>
                        <TableHead className="w-1/4">رقم الهاتف</TableHead>
                        <TableHead className="w-1/2">وسوم المجموعات (Group Tags)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.slice(0, 300).map(member => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium text-xs">
                            {member.name ? <strong>{member.name}</strong> : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            +{member.phone} {member.isMe && <Badge variant="secondary" className="mr-1.5 text-[10px]">أنت</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {(member.groups || []).map((g, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className={`text-[10px] ${g.isAdmin ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}
                                >
                                  <Tag className="w-2.5 h-2.5 ml-1" />
                                  {g.groupName} {g.isAdmin && '⭐'}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Group Details & Members Management Modal (shadcn/ui Dialog) */}
      <Dialog open={Boolean(selectedGroup)} onOpenChange={open => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6" dir="rtl">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="text-base font-bold">{selectedGroup?.subject}</DialogTitle>
            <DialogDescription className="text-xs">
              معرف المجموعة: {selectedGroup?.id}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Group Actions Bar */}
          <div className="bg-secondary/40 p-4 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-card px-3 py-1.5 rounded-lg border border-border">
                <input
                  type="checkbox"
                  checked={Boolean(groupDetails?.announce ?? selectedGroup?.announce)}
                  onChange={() => selectedGroup && handleToggleAnnounce(selectedGroup, Boolean(groupDetails?.announce ?? selectedGroup?.announce))}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span>قفل الإرسال (المشرفين فقط)</span>
              </label>

              <Button size="sm" variant="secondary" onClick={() => selectedGroup && window.open(`/api/groups/${encodeURIComponent(selectedGroup.id)}/export-csv`, '_blank')} className="text-xs">
                <Download className="w-3.5 h-3.5 ml-1.5" />
                تصدير (CSV)
              </Button>

              <Button size="sm" variant="secondary" onClick={() => selectedGroup && handleCopyInvite(selectedGroup)} className="text-xs">
                <Copy className="w-3.5 h-3.5 ml-1.5" />
                نسخ رابط الدعوة
              </Button>
            </div>

            <Button size="sm" variant="default" onClick={() => selectedGroup && setMessageGroup(selectedGroup)} className="text-xs">
              <Send className="w-3.5 h-3.5 ml-1.5" />
              إرسال رسالة
            </Button>
          </div>

          {/* Add member (if admin) */}
          {selectedGroup?.iAmAdmin && (
            <div className="flex gap-2">
              <Input
                placeholder="أدخل رقم الهاتف مع مفتاح الدولة (مثال: 966501234567)"
                value={newMemberPhone}
                onChange={e => setNewMemberPhone(e.target.value)}
                className="h-9 text-xs"
              />
              <Button size="sm" onClick={handleAddMember} disabled={addingMember} className="text-xs whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 ml-1.5" />
                {addingMember ? 'جاري الإضافة...' : 'إضافة للمجموعة'}
              </Button>
            </div>
          )}

          {/* Participants Table */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold">
                قائمة الأعضاء ({groupDetails?.participants?.length ?? '...'})
              </h4>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="بحث برقم الهاتف..."
                  value={participantSearch}
                  onChange={e => setParticipantSearch(e.target.value)}
                  className="pr-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-y-auto max-h-[320px] flex-1">
              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span>جاري تحميل الأعضاء...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-secondary/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs">الاسم</TableHead>
                      <TableHead className="text-xs">رقم الهاتف</TableHead>
                      <TableHead className="text-xs">الرتبة</TableHead>
                      <TableHead className="text-xs text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalParticipants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          لا يوجد أعضاء مطابقين للبحث
                        </TableCell>
                      </TableRow>
                    ) : (
                      modalParticipants.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium">
                            {p.name ? <strong>{p.name}</strong> : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            +{p.phone} {p.isMe && <Badge variant="secondary" className="mr-1 text-[10px]">أنت</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.isSuperAdmin ? (
                              <Badge variant="secondary" className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px]">مالك المجموعة</Badge>
                            ) : p.isAdmin ? (
                              <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">مشرف</Badge>
                            ) : (
                              <span className="text-muted-foreground">عضو</span>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            {selectedGroup?.iAmAdmin && !p.isMe && !p.isSuperAdmin ? (
                              <div className="flex items-center gap-1.5 justify-end">
                                {p.isAdmin ? (
                                  <Button size="sm" variant="outline" onClick={() => handleParticipantAction(p.id, 'demote')} className="h-7 px-2 text-[10px]">
                                    تنزيل رتبة
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={() => handleParticipantAction(p.id, 'promote')} className="h-7 px-2 text-[10px]">
                                    ترقية
                                  </Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => handleParticipantAction(p.id, 'remove')} className="h-7 px-2 text-[10px]">
                                  طرد
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setSelectedGroup(null)} className="text-xs">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog Modal (shadcn/ui Dialog) */}
      <Dialog open={Boolean(messageGroup)} onOpenChange={open => !open && setMessageGroup(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base">إرسال رسالة للمجموعة</DialogTitle>
            <DialogDescription className="text-xs">
              الإرسال إلى: <strong>{messageGroup?.subject}</strong>
            </DialogDescription>
          </DialogHeader>

          <textarea
            rows={4}
            placeholder="اكتب نص الرسالة هنا..."
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg p-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
          />

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMessageGroup(null)} className="text-xs">
              إلغاء
            </Button>
            <Button size="sm" onClick={handleSendMessage} disabled={sendingMessage} className="text-xs">
              <Send className="w-3.5 h-3.5 ml-1.5" />
              {sendingMessage ? 'جاري الإرسال...' : 'إرسال الآن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

