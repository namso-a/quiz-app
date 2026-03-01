import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

// POST /api/collaborators — add a collaborator by email (owner only)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { quiz_id, email } = await req.json()
  if (!quiz_id || !email) return NextResponse.json({ error: 'Manglende felter' }, { status: 400 })

  // Verify caller is the quiz owner
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quiz_id)
    .eq('teacher_id', user.id)
    .single()

  if (!quiz) return NextResponse.json({ error: 'Kun ejeren kan tilføje samarbejdspartnere' }, { status: 403 })

  // Look up the teacher by email
  const { data: teacher } = await adminClient
    .from('teachers')
    .select('id, name, email')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (!teacher) return NextResponse.json({ error: 'Ingen godkendt lærer fundet med den e-mail' }, { status: 404 })
  if (teacher.id === user.id) return NextResponse.json({ error: 'Du kan ikke tilføje dig selv' }, { status: 400 })

  // Check not already added
  const { data: existing } = await adminClient
    .from('quiz_collaborators')
    .select('teacher_id')
    .eq('quiz_id', quiz_id)
    .eq('teacher_id', teacher.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Allerede tilføjet som samarbejdspartner' }, { status: 400 })

  const { error: insertErr } = await adminClient
    .from('quiz_collaborators')
    .insert({ quiz_id, teacher_id: teacher.id })

  if (insertErr) return NextResponse.json({ error: 'Kunne ikke tilføje samarbejdspartner' }, { status: 500 })

  return NextResponse.json({ teacher_id: teacher.id, name: teacher.name, email: teacher.email })
}

// DELETE /api/collaborators — remove a collaborator (owner only)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })

  const { quiz_id, teacher_id } = await req.json()
  if (!quiz_id || !teacher_id) return NextResponse.json({ error: 'Manglende felter' }, { status: 400 })

  // Verify caller is the quiz owner
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quiz_id)
    .eq('teacher_id', user.id)
    .single()

  if (!quiz) return NextResponse.json({ error: 'Kun ejeren kan fjerne samarbejdspartnere' }, { status: 403 })

  await adminClient
    .from('quiz_collaborators')
    .delete()
    .eq('quiz_id', quiz_id)
    .eq('teacher_id', teacher_id)

  return NextResponse.json({ ok: true })
}
