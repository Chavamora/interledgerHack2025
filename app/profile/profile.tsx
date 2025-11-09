import React, { useEffect, useState, useRef } from 'react';
import { THEME } from '../../lib/theme';
import { Link } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Loader2 } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  // University account info
  school?: string;
  studentEmail?: string;
  avatarUrl?: string;
};

type ProfileData = { user: User };

// Small helper to convert hex color to rgba with alpha for translucent backgrounds
function hexToRgba(hex: string, alpha = 1) {
  try {
    const clean = hex.replace('#', '');
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean;
    const int = parseInt(full, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return hex;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: '24px auto', fontFamily: 'sans-serif', padding: 16 },
  card: {
    border: `1px solid ${THEME.light.border}`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    display: 'flex',
    gap: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    background: THEME.light.cardForeground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: THEME.light.mutedForeground,
  },
  info: { flex: 1 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { color: THEME.light.secondary, fontSize: 13 },
  value: { fontSize: 16, color: THEME.light.foreground },
  buttons: { display: 'flex', gap: 8 },
  btn: {
    padding: '8px 12px',
    borderRadius: 6,
    border: `1px solid ${THEME.light.secondary}`,
    background: THEME.light.cardForeground,
    cursor: 'pointer',
  },
  primary: {
    background: THEME.light.primary,
    color: THEME.light.primaryForeground,
    border: `1px solid ${THEME.light.primary}`,
  },
  danger: {
    background: THEME.light.destructive,
    color: THEME.light.primaryForeground,
    border: `1px solid ${THEME.light.destructive}`,
  },
  input: {
    padding: 8,
    borderRadius: 6,
    border: `1px solid ${THEME.light.border}`,
    width: '100%',
    background: THEME.light.input,
    color: THEME.light.primary,
  },
  small: { fontSize: 13, color: THEME.light.mutedForeground },
};

export default function ProfilePage() {
  const palette = THEME.light;
  // Feature flag: show or hide student/university information
  const SHOW_STUDENT_INFO = false;
  const [data, setData] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mobile slider state & ref (declare hooks before any early return)
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  // Mock load
  useEffect(() => {
    const mock: ProfileData = {
      user: {
        id: 'u_001',
        firstName: 'María',
        lastName: 'García',
        email: 'maria.garcia@example.com',
        school: 'Universidad Complutense de Madrid',
        studentEmail: 'm.garcia@student.ucm.es',
        phone: '+34 600 123 456',
        address: 'Calle Falsa 123, Madrid, España',
        avatarUrl: 'https://i.pinimg.com/736x/3f/ee/c8/3feec84e4e3d356fd59dd99bea0bea56.jpg',
      },
    };

    // Simulate API delay
    const t = setTimeout(() => {
      setData(mock);
      setForm(mock.user);
    }, 400);

    return () => clearTimeout(t);
  }, []);

  if (!data) {
    return <div style={styles.container}>Cargando perfil...</div>;
  }

  const user = data.user;

  function startEdit() {
    if (!data) return;
    setForm(data.user);
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    if (!data) return;
    setEditing(false);
    setForm(data.user);
    setError(null);
  }

  function handleChange<K extends keyof User>(key: K, value: User[K]) {
    setForm((prev) => ({ ...(prev || {}), [key]: value }));
  }

  function validateForm(): string | null {
    if (!form.firstName || !form.lastName) return 'Nombre y apellido son obligatorios.';
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) return 'Correo inválido.';
    return null;
  }

  function saveChanges() {
    const v = validateForm();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError(null);

    // Simulate API save
    setTimeout(() => {
      setData((prev) => (prev ? { ...prev, user: { ...prev.user, ...(form as User) } } : prev));
      setSaving(false);
      setEditing(false);
    }, 800);
  }

  function scrollToIndex(index: number) {
    const el = sliderRef.current;
    if (!el) return;
    const width = el.clientWidth;
    // prefer horizontal scroll on mobile slider
    if (el.scrollWidth > el.clientWidth) {
      el.scrollTo({ left: width * index, behavior: 'smooth' } as any);
    } else {
      const height = el.clientHeight;
      el.scrollTo({ top: height * index, behavior: 'smooth' } as any);
    }
    setSlideIndex(index);
  }

  function nextSlide() {
    const el = sliderRef.current;
    if (!el) return;
    const maxIndex = Math.max(0, Math.floor((el.scrollWidth - el.clientWidth) / el.clientWidth));
    const next = Math.min(slideIndex + 1, maxIndex || 1);
    scrollToIndex(next);
  }

  function prevSlide() {
    const prev = Math.max(slideIndex - 1, 0);
    scrollToIndex(prev);
  }

  // card renderers to avoid duplication
  function renderProfileCard() {
    return (
      <div
        className="relative m-4 flex w-full min-w-0 flex-col items-center gap-4 rounded-lg border p-6 md:flex-col"
        style={{ backgroundColor: hexToRgba(palette.card, 0.64) }}>
        {/* Desktop actions positioned top-right */}
        <div className="absolute right-4 top-4 hidden items-center gap-2 md:flex">
          {!editing && (
            <Button
              variant="outline"
              onPress={() => startEdit()}
              style={{ borderColor: palette.secondary }}>
              <Text>Editar</Text>
            </Button>
          )}
          {editing && (
            <Button variant="ghost" onPress={saveChanges} disabled={saving}>
              {saving ? (
                <>
                  <View className="pointer-events-none animate-spin">
                    <Icon as={Loader2} className="text-primary-foreground" />
                  </View>
                  <Text>Guardando...</Text>
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          )}
          {editing && (
            <Button
              variant="outline"
              onPress={cancelEdit}
              disabled={saving}
              style={{ borderColor: palette.secondary }}>
              <Text>Cancelar</Text>
            </Button>
          )}
        </div>
        <div
          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full md:h-44 md:w-44"
          style={{ backgroundColor: palette.cardForeground, color: palette.mutedForeground }}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="avatar"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            user.firstName?.[0] || 'U'
          )}
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <div>
            <Text
              className="text-center text-xl font-semibold md:text-2xl"
              style={{ color: palette.secondary }}>
              {user.firstName} {user.lastName}
            </Text>
          </div>
          <div className="text-sm">
            <Text className="text-center text-base" style={{ color: palette.foreground }}>
              {user.email}
            </Text>
          </div>
        </div>

        <div className="w-95 min-w-0 flex-1">
          <div className="mt-3">
            <div className="mb-2 flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="w-full min-w-0 sm:w-64">
                <div>
                  <Text
                    className="text-center text-base font-bold"
                    style={{ color: palette.secondary }}>
                    Nombre
                  </Text>
                </div>
                {editing ? (
                  <input
                    className="box-border w-full min-w-0 max-w-full rounded border p-2 text-left text-lg"
                    style={{ backgroundColor: palette.input, color: palette.secondary }}
                    value={form.firstName || ''}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                  />
                ) : (
                  <div>
                    <Text className="text-center text-lg" style={{ color: palette.foreground }}>
                      {user.firstName}
                    </Text>
                  </div>
                )}
              </div>

              <div className="w-full min-w-0 sm:w-64">
                <div>
                  <Text
                    className="text-center text-base font-bold"
                    style={{ color: palette.secondary }}>
                    Apellido
                  </Text>
                </div>
                {editing ? (
                  <input
                    className="box-border w-full min-w-0 max-w-full rounded border p-2 text-left text-lg"
                    style={{ backgroundColor: palette.input, color: palette.secondary }}
                    value={form.lastName || ''}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                  />
                ) : (
                  <div>
                    <Text className="text-center text-lg" style={{ color: palette.foreground }}>
                      {user.lastName}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-2 flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="w-full min-w-0 sm:w-64">
                <div>
                  <Text
                    className="text-center text-base font-bold"
                    style={{ color: palette.secondary }}>
                    Correo
                  </Text>
                </div>
                {editing ? (
                  <input
                    className="box-border w-full min-w-0 max-w-full rounded border p-2 text-left text-lg"
                    style={{ backgroundColor: palette.input, color: palette.secondary }}
                    value={form.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                ) : (
                  <div>
                    <Text className="text-center text-lg" style={{ color: palette.foreground }}>
                      {user.email}
                    </Text>
                  </div>
                )}
              </div>

              <div className="w-full min-w-0 sm:w-64">
                <div>
                  <Text
                    className="text-center text-base font-bold"
                    style={{ color: palette.secondary }}>
                    Teléfono
                  </Text>
                </div>
                {editing ? (
                  <input
                    className="box-border w-full min-w-0 max-w-full rounded border p-2 text-left text-lg"
                    style={{ backgroundColor: palette.input, color: palette.secondary }}
                    value={form.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                ) : (
                  <div>
                    <Text className="text-center text-lg" style={{ color: palette.foreground }}>
                      {user.phone || '—'}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2">
              <div>
                <Text
                  className="text-center text-base font-bold"
                  style={{ color: palette.secondary }}>
                  Dirección
                </Text>
              </div>
              {editing ? (
                <input
                  className="box-border w-full min-w-0 max-w-full rounded border p-2 text-left text-lg"
                  style={{ backgroundColor: palette.input, color: palette.secondary }}
                  value={form.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
              ) : (
                <div>
                  <Text className="text-center text-lg" style={{ color: palette.foreground }}>
                    {user.address || '—'}
                  </Text>
                </div>
              )}
            </div>

            {SHOW_STUDENT_INFO && (
              <div className="mt-4">
                <div>
                  <Text
                    className="text-center text-base font-bold"
                    style={{ color: palette.secondary }}>
                    Escuela
                  </Text>
                </div>
                {editing ? (
                  <input
                    className="mt-1 box-border w-full min-w-0 max-w-full rounded border p-2 text-left text-lg"
                    style={{ backgroundColor: palette.input, color: palette.secondary }}
                    value={form.school || ''}
                    onChange={(e) => handleChange('school', e.target.value)}
                  />
                ) : (
                  <div>
                    <Text className="text-center text-lg" style={{ color: palette.foreground }}>
                      {user.school || '—'}
                    </Text>
                  </div>
                )}

                <div className="mt-3">
                  <Text
                    className="text-center text-base font-bold"
                    style={{ color: palette.secondary }}>
                    Correo de estudiante
                  </Text>
                </div>
                {editing ? (
                  <input
                    className="mt-1 box-border w-full min-w-0 max-w-full rounded border p-2 text-left text-lg"
                    style={{ backgroundColor: palette.input, color: palette.secondary }}
                    value={form.studentEmail || ''}
                    onChange={(e) => handleChange('studentEmail', e.target.value)}
                  />
                ) : (
                  <div>
                    <Text className="text-center text-lg" style={{ color: palette.foreground }}>
                      {user.studentEmail || '—'}
                    </Text>
                  </div>
                )}
              </div>
            )}

            {error && <div className="mt-2 text-red-600">{error}</div>}
            {/* Mobile actions: centered at bottom */}
            <div className="mt-4 md:hidden">
              <div className="flex justify-center gap-3">
                {!editing && (
                  <Button
                    variant="outline"
                    onPress={() => startEdit()}
                    style={{ borderColor: palette.secondary }}>
                    <Text>Editar</Text>
                  </Button>
                )}
                {editing && (
                  <>
                    <Button variant="ghost" onPress={saveChanges} disabled={saving}>
                      {saving ? (
                        <>
                          <View className="pointer-events-none animate-spin">
                            <Icon as={Loader2} className="text-primary-foreground" />
                          </View>
                          <Text>Guardando...</Text>
                        </>
                      ) : (
                        'Guardar'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onPress={cancelEdit}
                      disabled={saving}
                      style={{ borderColor: palette.secondary }}>
                      <Text>Cancelar</Text>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: palette.background,
        backgroundImage: palette.backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      className="min-h-screen">
      <div className="mx-auto my-6 max-w-3xl gap-4 px-4 font-sans md:max-w-4xl">
        <div className="flex flex-row items-center gap-4 md:flex-row md:items-center md:gap-6">
          <Link href="/" asChild>
            <Button className="mb-2 md:mb-0 md:mr-4">
              <Text className="font-bold text-primary-foreground">Volver</Text>
            </Button>
          </Link>
          <Text
            className="mb-2 text-3xl font-bold md:text-4xl"
            style={{ color: palette.background }}>
            Perfil
          </Text>
        </div>
        {/* Unified slider for all sizes (single slide shown) */}
        <div className="relative">
          <div
            ref={sliderRef}
            className="flex touch-pan-x snap-x snap-mandatory flex-row overflow-x-auto scroll-smooth"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
              maxHeight: '88vh',
            }}>
            <div className="w-full min-w-0 flex-shrink-0 snap-start px-4 py-6">
              {renderProfileCard()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
