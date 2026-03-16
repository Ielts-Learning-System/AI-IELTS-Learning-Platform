import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useUserStore } from '../store/useUserStore';
import {
	Globe,
	Lock,
	Moon,
	Save,
	ShieldCheck,
	Sun,
	Target,
	User,
} from 'lucide-react';

type ThemeMode = 'light' | 'dark';
type LanguageMode = 'vi' | 'en';

const STORAGE_KEYS = {
	theme: 'settings.theme',
	language: 'settings.language',
	targetBand: 'settings.targetBand',
};

const translations = {
	vi: {
		pageTitle: 'Cài đặt',
		pageSubtitle: 'Quản lý tài khoản và tuỳ chọn cá nhân của bạn.',

		appearanceTitle: 'Tuỳ chọn giao diện',
		appearanceSubtitle: 'Tinh chỉnh ngôn ngữ, giao diện và mục tiêu IELTS của bạn.',
		themeLabel: 'Giao diện',
		themeLight: 'Sáng',
		themeDark: 'Tối',
		languageLabel: 'Ngôn ngữ',
		langVi: 'Tiếng Việt',
		langEn: 'English',
		targetBandLabel: 'Mục tiêu band score',
		savePrefs: 'Lưu tuỳ chọn',
		saving: 'Đang lưu...',
		prefsSaved: 'Đã lưu tuỳ chọn cá nhân.',
		prefsFailed: 'Không thể lưu tuỳ chọn vào trình duyệt.',

		profileTitle: 'Thông tin cá nhân',
		profileSubtitle: 'Cập nhật họ tên, email và số điện thoại của bạn.',
		loadingProfile: 'Đang tải thông tin người dùng...',
		fullNameLabel: 'Họ và tên',
		fullNamePlaceholder: 'Nguyễn Văn A',
		emailLabel: 'Email',
		emailPlaceholder: 'you@example.com',
		phoneLabel: 'Số điện thoại',
		phonePlaceholder: '0901 234 567',
		updateProfile: 'Cập nhật thông tin',
		updating: 'Đang cập nhật...',
		profileUpdated: 'Cập nhật thông tin thành công.',
		profileFetchFailed: 'Không thể tải thông tin người dùng.',
		profileUpdateFailed: 'Không thể cập nhật thông tin cá nhân.',
		profileValidation: 'Vui lòng nhập đầy đủ họ tên và email.',
		notLoggedIn: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.',

		securityTitle: 'Bảo mật tài khoản',
		securitySubtitle: 'Đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn.',
		currentPasswordLabel: 'Mật khẩu hiện tại',
		newPasswordLabel: 'Mật khẩu mới',
		confirmPasswordLabel: 'Xác nhận mật khẩu mới',
		changePassword: 'Đổi mật khẩu',
		changingPassword: 'Đang đổi mật khẩu...',
		passwordChanged: 'Đổi mật khẩu thành công.',
		passwordChangeFailed: 'Không thể đổi mật khẩu.',
		passwordMismatch: 'Mật khẩu mới và xác nhận mật khẩu chưa khớp.',
		passwordRequired: 'Vui lòng điền đầy đủ thông tin mật khẩu.',
		passwordWrong: 'Mật khẩu hiện tại không đúng.',
	},
	en: {
		pageTitle: 'Settings',
		pageSubtitle: 'Manage your account and personal preferences.',

		appearanceTitle: 'Appearance & Preferences',
		appearanceSubtitle: 'Adjust language, theme, and your IELTS target.',
		themeLabel: 'Theme',
		themeLight: 'Light',
		themeDark: 'Dark',
		languageLabel: 'Language',
		langVi: 'Tiếng Việt',
		langEn: 'English',
		targetBandLabel: 'Target band score',
		savePrefs: 'Save preferences',
		saving: 'Saving...',
		prefsSaved: 'Preferences saved.',
		prefsFailed: 'Could not save preferences to browser.',

		profileTitle: 'Personal Information',
		profileSubtitle: 'Update your name, email and phone number.',
		loadingProfile: 'Loading profile...',
		fullNameLabel: 'Full name',
		fullNamePlaceholder: 'Nguyen Van A',
		emailLabel: 'Email',
		emailPlaceholder: 'you@example.com',
		phoneLabel: 'Phone number',
		phonePlaceholder: '0901 234 567',
		updateProfile: 'Update profile',
		updating: 'Updating...',
		profileUpdated: 'Profile updated successfully.',
		profileFetchFailed: 'Could not load user information.',
		profileUpdateFailed: 'Could not update personal information.',
		profileValidation: 'Please enter your full name and email.',
		notLoggedIn: 'You are not logged in or your session has expired.',

		securityTitle: 'Account Security',
		securitySubtitle: 'Change your password regularly to keep your account safe.',
		currentPasswordLabel: 'Current password',
		newPasswordLabel: 'New password',
		confirmPasswordLabel: 'Confirm new password',
		changePassword: 'Change password',
		changingPassword: 'Changing...',
		passwordChanged: 'Password changed successfully.',
		passwordChangeFailed: 'Could not change password.',
		passwordMismatch: 'New password and confirmation do not match.',
		passwordRequired: 'Please fill in all password fields.',
		passwordWrong: 'Current password is incorrect.',
	},
};

const getApiBase = () => {
	const viteBase = import.meta.env.VITE_API_URL as string | undefined;
	const nextBase = (globalThis as { process?: { env?: Record<string, string> } }).process?.env
		?.NEXT_PUBLIC_API_URL;

	const rawBase = (viteBase || nextBase || 'http://localhost:3000').replace(/\/$/, '');

	if (rawBase.endsWith('/api')) {
		return `${rawBase}/auth`;
	}

	return `${rawBase}/api/auth`;
};

const getAuthToken = () =>
	localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const getErrorMessage = (error: unknown, fallback: string) => {
	if (axios.isAxiosError(error)) {
		const apiMessage =
			(error.response?.data as { message?: string; error?: string } | undefined)?.message ||
			(error.response?.data as { message?: string; error?: string } | undefined)?.error;

		if (!apiMessage) return fallback;

		const normalized = apiMessage.toLowerCase();
		if (normalized.includes('current password') && normalized.includes('incorrect')) {
			return 'Mật khẩu hiện tại không đúng.';
		}

		return apiMessage;
	}

	return fallback;
};

export default function SettingPage() {
	const apiAuthBase = useMemo(() => getApiBase(), []);
	const { user: storeUser, setAuth } = useUserStore();

	const [theme, setTheme] = useState<ThemeMode>('light');
	const [language, setLanguage] = useState<LanguageMode>('vi');
	const [targetBand, setTargetBand] = useState('6.5');

	const [fullName, setFullName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');

	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const [isFetchingProfile, setIsFetchingProfile] = useState(true);
	const [isSavingPreferences, setIsSavingPreferences] = useState(false);
	const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	const t = translations[language];

	useEffect(() => {
		const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) as ThemeMode | null;
		const savedLanguage = localStorage.getItem(STORAGE_KEYS.language) as LanguageMode | null;
		const savedTargetBand = localStorage.getItem(STORAGE_KEYS.targetBand);

		if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
		if (savedLanguage === 'vi' || savedLanguage === 'en') setLanguage(savedLanguage);
		if (savedTargetBand) setTargetBand(savedTargetBand);
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
		localStorage.setItem(STORAGE_KEYS.theme, theme);
	}, [theme]);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEYS.language, language);
	}, [language]);

	useEffect(() => {
		const fetchProfile = async () => {
			const token = getAuthToken();
			if (!token) {
				setIsFetchingProfile(false);
				return;
			}

			try {
				const config = { headers: { Authorization: `Bearer ${token}` } };

				let response;
				try {
					response = await axios.get(`${apiAuthBase}/me`, config);
				} catch (error) {
					if (axios.isAxiosError(error) && error.response?.status === 404) {
						response = await axios.get(`${apiAuthBase}/profile`, config);
					} else {
						throw error;
					}
				}

				const userData =
					(response.data as { data?: Record<string, unknown>; user?: Record<string, unknown> }).data ||
					(response.data as { data?: Record<string, unknown>; user?: Record<string, unknown> }).user ||
					response.data;

				setFullName(String(userData?.name || userData?.fullName || ''));
				setEmail(String(userData?.email || ''));
				setPhone(String(userData?.phone || ''));
			} catch (error) {
				alert(getErrorMessage(error, translations.vi.profileFetchFailed));
			} finally {
				setIsFetchingProfile(false);
			}
		};

		void fetchProfile();
	}, [apiAuthBase]);

	const handleSavePreferences = () => {
		setIsSavingPreferences(true);
		try {
			localStorage.setItem(STORAGE_KEYS.theme, theme);
			localStorage.setItem(STORAGE_KEYS.language, language);
			localStorage.setItem(STORAGE_KEYS.targetBand, targetBand);
			alert(t.prefsSaved);
		} catch {
			alert(t.prefsFailed);
		} finally {
			setIsSavingPreferences(false);
		}
	};

	const handleUpdateProfile = async () => {
		const token = getAuthToken();
		if (!token) {
			alert(t.notLoggedIn);
			return;
		}
		if (!fullName.trim() || !email.trim()) {
			alert(t.profileValidation);
			return;
		}

		setIsUpdatingProfile(true);
		try {
			const payload = { name: fullName.trim(), email: email.trim(), phone: phone.trim() };

			try {
				await axios.put(`${apiAuthBase}/profile`, payload, {
					headers: { Authorization: `Bearer ${token}` },
				});
			} catch (error) {
				if (axios.isAxiosError(error) && error.response?.status === 404) {
					await axios.put(`${apiAuthBase}/me`, payload, {
						headers: { Authorization: `Bearer ${token}` },
					});
				} else {
					throw error;
				}
			}

			// Sync updated name into the Zustand store so the Navbar reflects the change immediately
			if (storeUser) {
				setAuth(
					{ ...storeUser, name: fullName.trim(), email: email.trim() },
					token,
				);
			}
			alert(t.profileUpdated);
		} catch (error) {
			alert(getErrorMessage(error, t.profileUpdateFailed));
		} finally {
			setIsUpdatingProfile(false);
		}
	};

	const handleChangePassword = async () => {
		const token = getAuthToken();
		if (!token) {
			alert(t.notLoggedIn);
			return;
		}
		if (!currentPassword || !newPassword || !confirmPassword) {
			alert(t.passwordRequired);
			return;
		}
		if (newPassword !== confirmPassword) {
			alert(t.passwordMismatch);
			return;
		}

		setIsChangingPassword(true);
		try {
			await axios.put(
				`${apiAuthBase}/change-password`,
				{ currentPassword, newPassword },
				{ headers: { Authorization: `Bearer ${token}` } },
			);

			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			alert(t.passwordChanged);
		} catch (error) {
			alert(getErrorMessage(error, t.passwordChangeFailed));
		} finally {
			setIsChangingPassword(false);
		}
	};

	const inputCls =
		'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-[#E31837] focus:outline-none focus:ring-2 focus:ring-red-500/20';

	const primaryBtn =
		'inline-flex items-center gap-2 rounded-lg bg-[#E31837] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

	return (
		<div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
			<div className="mx-auto max-w-5xl">

				{/* Page header */}
				<div className="mb-6 border-b border-gray-200 pb-5">
					<h1 className="text-2xl font-bold text-slate-900">{t.pageTitle}</h1>
					<p className="mt-1 text-sm text-slate-500">{t.pageSubtitle}</p>
				</div>

				{/* ── Row 1: Appearance (full width) ── */}
				<section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
					<div className="border-b border-gray-100 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
								<Globe className="h-5 w-5 text-[#E31837]" />
							</div>
							<div>
								<h2 className="font-semibold text-slate-900">{t.appearanceTitle}</h2>
								<p className="text-xs text-slate-500">{t.appearanceSubtitle}</p>
							</div>
						</div>
					</div>

					<div className="p-6">
						<div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
							{/* Theme toggle */}
							<div>
								<p className="mb-2 text-sm font-medium text-slate-700">{t.themeLabel}</p>
								<div className="flex gap-2">
									{(
										[
											{ value: 'light', icon: Sun, label: t.themeLight },
											{ value: 'dark', icon: Moon, label: t.themeDark },
										] as const
									).map(({ value, icon: Icon, label }) => (
										<button
											key={value}
											type="button"
											onClick={() => setTheme(value)}
											className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
												theme === value
													? 'border-[#E31837] bg-red-50 text-[#E31837]'
													: 'border-gray-200 text-slate-600 hover:border-red-200 hover:bg-red-50/60'
											}`}
										>
											<Icon className="h-4 w-4" />
											{label}
										</button>
									))}
								</div>
							</div>

							{/* Language */}
							<div>
								<label htmlFor="language" className="mb-2 block text-sm font-medium text-slate-700">
									{t.languageLabel}
								</label>
								<select
									id="language"
									value={language}
									onChange={(e) => setLanguage(e.target.value as LanguageMode)}
									className={inputCls}
								>
									<option value="vi">{t.langVi}</option>
									<option value="en">{t.langEn}</option>
								</select>
							</div>

							{/* Target band */}
							<div>
								<label
									htmlFor="targetBand"
									className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700"
								>
									<Target className="h-4 w-4 text-[#E31837]" />
									{t.targetBandLabel}
								</label>
								<input
									id="targetBand"
									type="number"
									min="0"
									max="9"
									step="0.5"
									value={targetBand}
									onChange={(e) => setTargetBand(e.target.value)}
									className={inputCls}
								/>
							</div>
						</div>

						<div className="mt-5 flex justify-end">
							<button
								type="button"
								onClick={handleSavePreferences}
								disabled={isSavingPreferences}
								className={primaryBtn}
							>
								<Save className="h-4 w-4" />
								{isSavingPreferences ? t.saving : t.savePrefs}
							</button>
						</div>
					</div>
				</section>

				{/* ── Row 2: Profile (left) + Security (right) ── */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

					{/* Profile card */}
					<section className="rounded-xl border border-gray-200 bg-white shadow-sm">
						<div className="border-b border-gray-100 px-6 py-4">
							<div className="flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
									<User className="h-5 w-5 text-[#E31837]" />
								</div>
								<div>
									<h2 className="font-semibold text-slate-900">{t.profileTitle}</h2>
									<p className="text-xs text-slate-500">{t.profileSubtitle}</p>
								</div>
							</div>
						</div>

						<div className="p-6">
							{isFetchingProfile ? (
								<div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#E31837]">
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									{t.loadingProfile}
								</div>
							) : (
								<div className="flex flex-col gap-4">
									<div>
										<label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-700">
											{t.fullNameLabel}
										</label>
										<input
											id="fullName"
											type="text"
											value={fullName}
											onChange={(e) => setFullName(e.target.value)}
											placeholder={t.fullNamePlaceholder}
											className={inputCls}
										/>
									</div>
									<div>
										<label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
											{t.emailLabel}
										</label>
										<input
											id="email"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder={t.emailPlaceholder}
											className={inputCls}
										/>
									</div>
									<div>
										<label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
											{t.phoneLabel}
										</label>
										<input
											id="phone"
											type="tel"
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											placeholder={t.phonePlaceholder}
											className={inputCls}
										/>
									</div>
									<div className="flex justify-end pt-1">
										<button
											type="button"
											onClick={handleUpdateProfile}
											disabled={isUpdatingProfile}
											className={primaryBtn}
										>
											<Save className="h-4 w-4" />
											{isUpdatingProfile ? t.updating : t.updateProfile}
										</button>
									</div>
								</div>
							)}
						</div>
					</section>

					{/* Security card */}
					<section className="rounded-xl border border-gray-200 bg-white shadow-sm">
						<div className="border-b border-gray-100 px-6 py-4">
							<div className="flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
									<ShieldCheck className="h-5 w-5 text-[#E31837]" />
								</div>
								<div>
									<h2 className="font-semibold text-slate-900">{t.securityTitle}</h2>
									<p className="text-xs text-slate-500">{t.securitySubtitle}</p>
								</div>
							</div>
						</div>

						<div className="p-6">
							<div className="flex flex-col gap-4">
								<div>
									<label
										htmlFor="currentPassword"
										className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"
									>
										<Lock className="h-3.5 w-3.5 text-slate-400" />
										{t.currentPasswordLabel}
									</label>
									<input
										id="currentPassword"
										type="password"
										value={currentPassword}
										onChange={(e) => setCurrentPassword(e.target.value)}
										className={inputCls}
									/>
								</div>
								<div>
									<label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
										{t.newPasswordLabel}
									</label>
									<input
										id="newPassword"
										type="password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										className={inputCls}
									/>
								</div>
								<div>
									<label
										htmlFor="confirmPassword"
										className="mb-1.5 block text-sm font-medium text-slate-700"
									>
										{t.confirmPasswordLabel}
									</label>
									<input
										id="confirmPassword"
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className={inputCls}
									/>
								</div>
								<div className="flex justify-end pt-1">
									<button
										type="button"
										onClick={handleChangePassword}
										disabled={isChangingPassword}
										className={primaryBtn}
									>
										<ShieldCheck className="h-4 w-4" />
										{isChangingPassword ? t.changingPassword : t.changePassword}
									</button>
								</div>
							</div>
						</div>
					</section>

				</div>
			</div>
		</div>
	);
}
