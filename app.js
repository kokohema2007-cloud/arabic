import { db, storage, collection, addDoc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp, ref, uploadBytes, getDownloadURL } from './firebase.js';\n\nconst ADMIN_UID = 'admin';\nconst ADMIN_PASSWORD = 'Admin@123456';\n

const state = {
  currentUser: null,
  lessons: [],
  selectedLessonId: null,
};

const elements = {
  authScreen: document.getElementById("authScreen"),
  registerScreen: document.getElementById("registerScreen"),
  dashboardScreen: document.getElementById("dashboardScreen"),
  rechargeScreen: document.getElementById("rechargeScreen"),
  playerScreen: document.getElementById("playerScreen"),
  loginForm: document.getElementById("loginForm"),
  registerDetailsForm: document.getElementById("registerDetailsForm"),
  teacherForm: document.getElementById("teacherForm"),
  accessForm: document.getElementById("accessForm"),
  rechargeForm: document.getElementById("rechargeForm"),
  authMessage: document.getElementById("authMessage"),
  registerDetailsMessage: document.getElementById("registerDetailsMessage"),
  teacherMessage: document.getElementById("teacherMessage"),
  accessMessage: document.getElementById("accessMessage"),
  rechargeMessage: document.getElementById("rechargeMessage"),
  openRegisterPageBtn: document.getElementById("openRegisterPageBtn"),
  backFromRegisterBtn: document.getElementById("backFromRegisterBtn"),
  backFromRechargeBtn: document.getElementById("backFromRechargeBtn"),
  backFromPlayerBtn: document.getElementById("backFromPlayerBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  rechargeNavBtn: document.getElementById("rechargeNavBtn"),
  userChip: document.getElementById("userChip"),
  teacherPanel: document.getElementById("teacherPanel"),
  lessonsContainer: document.getElementById("lessonsGrid"),
  lessonStats: document.getElementById("lessonStats"),
  selectedLessonBox: document.getElementById("selectedLessonBox"),
  lessonCodeInput: document.getElementById("lessonCodeInput"),
  lessonFrame: document.getElementById("lessonFrame"),
  lessonVideo: document.getElementById("lessonVideo"),
  playerPageTitle: document.getElementById("playerPageTitle"),
  viewerSubject: document.getElementById("viewerSubject"),
  viewerDuration: document.getElementById("viewerDuration"),
  viewerCode: document.getElementById("viewerCode"),
  viewerDescription: document.getElementById("viewerDescription"),
  heroLessonsCount: document.getElementById("heroLessonsCount"),
  heroUnlockedCount: document.getElementById("heroUnlockedCount"),
  heroLockedCount: document.getElementById("heroLockedCount"),
  activeSubjectStat: document.getElementById("activeSubjectStat"),
  activeLessonStat: document.getElementById("activeLessonStat"),
  activeStatusStat: document.getElementById("activeStatusStat"),
  studentIdPreviewInput: document.getElementById("studentIdPreviewInput"),
  receiptInput: document.getElementById("receiptInput"),
  studentsTable: document.getElementById("studentsTable"),
};

function setMessage(element, text, type = "info") {
  if (!element) return;
  element.textContent = text;
  element.className = `message-box ${type}`;
}

function clearMessage(element) {
  if (!element) return;
  element.textContent = "";
  element.className = "message-box";
}



async function getUsers() {\n  const snapshot = await getDocs(collection(db, 'users'));\n  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));\n}\n\nasync function getUserById(uid) {\n  const docSnap = await getDoc(doc(db, 'users', uid));\n  if (docSnap.exists()) {\n    return { uid: docSnap.id, ...docSnap.data() };\n  }\n  return null;\n}\n\nasync function saveUser(userData) {\n  await setDoc(doc(db, 'users', userData.uid), userData);\n}\n

async function getLessons() {\n  const snapshot = await getDocs(query(collection(db, 'lessons'), orderBy('createdAt', 'desc')));\n  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));\n}\n\nasync function addLessonToFirestore(lessonData) {\n  const docRef = await addDoc(collection(db, 'lessons'), {\n    ...lessonData,\n    createdAt: serverTimestamp()\n  });\n  return docRef.id;\n}\n\nasync function deleteLessonFromFirestore(lessonId) {\n  await deleteDoc(doc(db, 'lessons', lessonId));\n}\n

function getSessionUid() {\n  try {\n    const session = localStorage.getItem('aragab.session');\n    return session ? JSON.parse(session).uid : null;\n  } catch {\n    return null;\n  }\n}\n\nfunction saveSessionUid(uid) {\n  localStorage.setItem('aragab.session', JSON.stringify({ uid }));\n}\n\nfunction clearSessionUid() {\n  localStorage.removeItem('aragab.session');\n}\n

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}



async function ensureSeedData() {\n  // Check admin\n  const adminSnap = await getDoc(doc(db, 'users', ADMIN_UID));\n  if (!adminSnap.exists()) {\n    await setDoc(doc(db, 'users', ADMIN_UID), {\n      uid: ADMIN_UID,\n      username: 'admin',\n      password: ADMIN_PASSWORD,\n      name: 'Admin',\n      role: 'admin',\n      studentPhone: '',\n      fatherPhone: '',\n      motherPhone: '',\n    });\n  }\n\n  // Check demo lesson\n  const lessonsSnap = await getDocs(collection(db, 'lessons'));\n  if (lessonsSnap.empty) {\n    await addDoc(collection(db, 'lessons'), {\n      title: 'حصة تجريبية',\n      subject: 'لغة عربية',\n      duration: '45 دقيقة',\n      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',\n      description: 'حصة تجريبية مع Firebase',\n      codes: ['AR-START-2026'],\n      createdAt: serverTimestamp(),\n    });\n  }\n}\n

function showScreen(name) {
  elements.authScreen?.classList.toggle("hidden", name !== "auth");
  elements.registerScreen?.classList.toggle("hidden", name !== "register");
  elements.dashboardScreen?.classList.toggle("hidden", name !== "dashboard");
  elements.rechargeScreen?.classList.toggle("hidden", name !== "recharge");
  elements.playerScreen?.classList.toggle("hidden", name !== "player");
}

function getLessonCodes(lesson) {
  return Array.isArray(lesson?.codes) ? lesson.codes : [];
}

function getSelectedLesson() {
  return state.lessons.find((lesson) => lesson.id === state.selectedLessonId) || null;
}

function stopLessonMedia() {
  if (elements.lessonFrame) {
    elements.lessonFrame.src = "";
    elements.lessonFrame.classList.add("hidden");
  }
  if (elements.lessonVideo) {
    elements.lessonVideo.pause();
    elements.lessonVideo.removeAttribute("src");
    elements.lessonVideo.load();
    elements.lessonVideo.classList.add("hidden");
  }
}

async function renderStudents() {\n  if (!elements.studentsTable) return;\n  try {\n    const students = (await getUsers()).filter((user) => user.role !== "admin");\n\n    if (!students.length) {\n      elements.studentsTable.innerHTML = '<div class="selected-lesson">لا يوجد طلاب مسجلون حتى الآن.</div>';\n      return;\n    }\n\n    elements.studentsTable.innerHTML = `\n      <div class="students-table-grid">\n        ${students\n          .map(\n            (student) => `\n              <article class="student-card">\n                <strong>${student.name || student.username}</strong>\n                <span>اسم المستخدم: ${student.username}</span>\n                <span>رقم الطالب: ${student.studentPhone || "-"}</span>\n                <span>رقم الأب: ${student.fatherPhone || "-"}</span>\n                <span>رقم الأم: ${student.motherPhone || "-"}</span>\n              </article>\n            `,\n          )\n          .join("")}\n      </div>\n    `;\n  } catch (error) {\n    console.error('Error loading students:', error);\n    elements.studentsTable.innerHTML = '<div class="selected-lesson">خطأ في تحميل الطلاب.</div>';\n  }\n}\n

function setSelectedLesson(lessonId) {
  state.selectedLessonId = lessonId;
  const lesson = getSelectedLesson();

  if (!lesson) {
    elements.selectedLessonBox.textContent = "اختر حصة من القائمة لعرض تفاصيلها هنا.";
    elements.activeLessonStat.textContent = "لم يتم الاختيار";
    elements.activeStatusStat.textContent = "مقفولة";
    return;
  }

  elements.selectedLessonBox.innerHTML = `
    <strong>${lesson.title}</strong><br>
    المادة: ${lesson.subject || "عام"}<br>
    المدة: ${lesson.duration || "-"}<br>
    ${state.currentUser?.role === "admin" ? `الأكواد: ${getLessonCodes(lesson).join(" | ") || "-"}` : "أدخل كود الحصة لفتحها"}
  `;

  elements.activeLessonStat.textContent = lesson.title;
  elements.activeStatusStat.textContent = "جاهزة";
}

async function renderLessons() {\n  try {\n    state.lessons = await getLessons();\n\n    elements.heroLessonsCount.textContent = String(state.lessons.length);\n    elements.heroUnlockedCount.textContent = String(state.lessons.length);\n    elements.heroLockedCount.textContent = "0";\n    elements.activeSubjectStat.textContent = state.lessons[0]?.subject || "عام";\n\n    if (!state.lessons.length) {\n      elements.lessonsContainer.innerHTML = '<div class="selected-lesson">لا توجد حصص مضافة حتى الآن.</div>';\n      elements.lessonStats.textContent = "سيتم عرض الحصص هنا فور إضافتها.";\n      setSelectedLesson(null);\n      return;\n    }\n\n    if (!state.lessons.some((lesson) => lesson.id === state.selectedLessonId)) {\n      state.selectedLessonId = state.lessons[0].id;\n    }\n\n    elements.lessonStats.textContent = `إجمالي الحصص الحالية: ${state.lessons.length}`;\n    elements.lessonsContainer.innerHTML = state.lessons\n      .map(\n        (lesson) => `\n          <article class="lesson-card unlocked">\n            <div class="lesson-badge">${lesson.subject || "عام"}</div>\n            <div>\n              <h4>${lesson.title}</h4>\n              <p>${lesson.description || "بدون وصف"}</p>\n            </div>\n            <div class="lesson-meta">\n              <span>${lesson.duration || "-"}</span>\n              <span>متاحة</span>\n            </div>\n            <button type="button" data-select-lesson-id="${lesson.id}">اختيار الحصة</button>\n            ${state.currentUser?.role === "admin" ? `<button class="danger-btn" type="button" data-delete-lesson-id="${lesson.id}">حذف الحصة</button>` : ""}\n          </article>\n        `,\n      )\n      .join(""); \n\n    elements.lessonsContainer.querySelectorAll("[data-select-lesson-id]").forEach((button) => {\n      button.addEventListener("click", () => {\n        setSelectedLesson(button.dataset.selectLessonId);\n        clearMessage(elements.accessMessage);\n      });\n    });\n\n    elements.lessonsContainer.querySelectorAll("[data-delete-lesson-id]").forEach((button) => {\n      button.addEventListener("click", () => {\n        deleteLessonFromFirestore(button.dataset.deleteLessonId);\n        renderLessons();\n      });\n    });\n\n    setSelectedLesson(state.selectedLessonId);\n  } catch (error) {\n    console.error('Error loading lessons:', error);\n    elements.lessonsContainer.innerHTML = '<div class="selected-lesson">خطأ في تحميل الحصص.</div>';\n  }\n}\n

function updateAuthUI() {
  if (!state.currentUser) {
    elements.userChip?.classList.add("hidden");
    elements.logoutBtn?.classList.add("hidden");
    elements.teacherPanel?.classList.add("hidden");
    showScreen("auth");
    return;
  }

  elements.userChip.textContent = `${state.currentUser.username} | ${state.currentUser.role === "admin" ? "أدمن" : "طالب"}`;
  elements.userChip.classList.remove("hidden");
  elements.logoutBtn.classList.remove("hidden");
  elements.teacherPanel.classList.toggle("hidden", state.currentUser.role !== "admin");
  await renderStudents();\n  if (elements.studentIdPreviewInput) {\n    elements.studentIdPreviewInput.value = state.currentUser.username;\n  }\n  showScreen("dashboard");\n}\n\nasync function updateAuthUI() {\n  if (!state.currentUser) {\n    elements.userChip?.classList.add("hidden");\n    elements.logoutBtn?.classList.add("hidden");\n    elements.teacherPanel?.classList.add("hidden");\n    showScreen("auth");\n    return;\n  }\n\n  elements.userChip.textContent = `${state.currentUser.username} | ${state.currentUser.role === "admin" ? "أدمن" : "طالب"}`;\n  elements.userChip.classList.remove("hidden");\n  elements.logoutBtn.classList.remove("hidden");\n  elements.teacherPanel.classList.toggle("hidden", state.currentUser.role !== "admin");\n  await renderStudents();\n  if (elements.studentIdPreviewInput) {\n    elements.studentIdPreviewInput.value = state.currentUser.username;\n  }\n  showScreen("dashboard");\n}

async function loginUser(formData) {\n  const identifier = String(formData.get("identifier") || "").trim();\n  const password = String(formData.get("password") || "");\n\n  if (!identifier || !password) {\n    setMessage(elements.authMessage, "أدخل اسم المستخدم وكلمة المرور.", "error");\n    return;\n  }\n\n  try {\n    const users = await getUsers();\n    let user = users.find((item) => item.username === identifier && item.password === password);\n\n    // Special admin login\n    if (identifier === 'admin' && password === ADMIN_PASSWORD) {\n      user = await getUserById(ADMIN_UID);\n    }\n\n    if (!user) {\n      setMessage(elements.authMessage, "اسم المستخدم أو كلمة المرور غير صحيحة.", "error");\n      return;\n    }\n\n    state.currentUser = user;\n    saveSessionUid(user.uid);\n    clearMessage(elements.authMessage);\n    await updateAuthUI();\n  } catch (error) {\n    console.error('Login error:', error);\n    setMessage(elements.authMessage, "خطأ في الاتصال.", "error");\n  }\n}\n

async function registerUser(formData) {\n  const name = String(formData.get("name") || "").trim();\n  const username = String(formData.get("identifier") || "").trim();\n  const password = String(formData.get("password") || "");\n  const studentPhone = String(formData.get("studentPhone") || "").trim();\n  const fatherPhone = String(formData.get("fatherPhone") || "").trim();\n  const motherPhone = String(formData.get("motherPhone") || "").trim();\n\n  if (!name || !username || !password || password.length < 8) {\n    setMessage(elements.registerDetailsMessage, "أكمل كل البيانات الأساسية وكلمة مرور 8 أحرف.", "error");\n    return;\n  }\n\n  try {\n    const users = await getUsers();\n    if (users.some((user) => user.username === username)) {\n      setMessage(elements.registerDetailsMessage, "اسم المستخدم مستخدم بالفعل.", "error");\n      return;\n    }\n\n    const uid = createId("user");\n    const userData = {\n      uid,\n      username,\n      password,\n      name,\n      role: "student",\n      studentPhone,\n      fatherPhone,\n      motherPhone,\n    };\n\n    await saveUser(userData);\n    elements.registerDetailsForm.reset();\n    await renderStudents();\n    setMessage(elements.registerDetailsMessage, "تم إنشاء الحساب بنجاح.", "success");\n  } catch (error) {\n    console.error('Register error:', error);\n    setMessage(elements.registerDetailsMessage, "خطأ في الإنشاء.", "error");\n  }\n}\n

function normalizeVideoUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";

  if (/^www\./i.test(url)) {
    return `https://${url}`;
  }

  if (url.includes("youtube.com/watch?v=")) {
    const id = new URL(url).searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }

  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }

  if (url.includes("youtube.com/shorts/")) {
    const id = url.split("shorts/")[1]?.split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }

  if (url.includes("drive.google.com/file/d/")) {
    const id = url.split("drive.google.com/file/d/")[1]?.split("/")[0];
    return id ? `https://drive.google.com/file/d/${id}/preview` : url;
  }

  if (url.includes("drive.google.com/open?id=")) {
    const id = new URL(url).searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : url;
  }

  if (url.includes("vimeo.com/") && !url.includes("player.vimeo.com/video/")) {
    const id = url.split("vimeo.com/")[1]?.split(/[?&/]/)[0];
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }

  return url;
}

function isDirectVideoUrl(url) {
  const value = String(url || "").toLowerCase();
  return (
    value.endsWith(".mp4") ||
    value.endsWith(".webm") ||
    value.endsWith(".ogg") ||
    value.includes(".mp4?") ||
    value.includes(".webm?") ||
    value.includes(".ogg?")
  );
}

function addLesson(formData) {
  if (state.currentUser?.role !== "admin") {
    setMessage(elements.teacherMessage, "غير مسموح إلا للأدمن.", "error");
    return;
  }

  const title = String(formData.get("title") || "").trim();
  const subject = String(formData.get("subject") || "").trim() || "عام";
  const duration = String(formData.get("duration") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const videoUrl = normalizeVideoUrl(formData.get("videoUrl"));
  const codes = String(formData.get("code") || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!title) {
    setMessage(elements.teacherMessage, "اكتب اسم الحصة أولًا.", "error");
    return;
  }

  if (!videoUrl) {
    setMessage(elements.teacherMessage, "أضف رابط فيديو صحيح.", "error");
    return;
  }

  const lessons = getLessons();
  lessons.unshift({
    id: createId("lesson"),
    title,
    subject,
    duration,
    videoUrl,
    description,
    codes,
    createdAt: new Date().toISOString(),
  });

  saveLessons(lessons);
  elements.teacherForm.reset();
  renderLessons();
  setMessage(elements.teacherMessage, "تمت إضافة الحصة بنجاح.", "success");
}

function openLesson(lesson) {
  stopLessonMedia();
  elements.playerPageTitle.textContent = lesson.title;
  elements.viewerSubject.textContent = lesson.subject || "عام";
  elements.viewerDuration.textContent = lesson.duration || "-";
  elements.viewerCode.textContent = `عدد الأكواد: ${getLessonCodes(lesson).length}`;
  elements.viewerDescription.textContent = lesson.description || "";

  if (isDirectVideoUrl(lesson.videoUrl)) {
    elements.lessonVideo.src = lesson.videoUrl;
    elements.lessonVideo.classList.remove("hidden");
    elements.lessonFrame.classList.add("hidden");
  } else {
    elements.lessonFrame.src = lesson.videoUrl || "";
    elements.lessonFrame.classList.remove("hidden");
    elements.lessonVideo.classList.add("hidden");
  }

  showScreen("player");
}

function unlockLesson(lessonId, code) {
  const lesson = state.lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    setMessage(elements.accessMessage, "الحصة غير موجودة.", "error");
    return;
  }

  if (state.currentUser?.role === "admin") {
    clearMessage(elements.accessMessage);
    openLesson(lesson);
    return;
  }

  if (!code.trim()) {
    setMessage(elements.accessMessage, "أدخل كود الحصة أولًا.", "error");
    return;
  }

  if (!getLessonCodes(lesson).includes(code.trim())) {
    setMessage(elements.accessMessage, "الكود غير صحيح.", "error");
    return;
  }

  clearMessage(elements.accessMessage);
  openLesson(lesson);
}

function deleteLesson(id) {
  const lessons = getLessons().filter((lesson) => lesson.id !== id);
  saveLessons(lessons);
  renderLessons();
  setMessage(elements.teacherMessage, "تم حذف الحصة.", "success");
}

function submitRecharge() {
  if (!state.currentUser) {
    setMessage(elements.rechargeMessage, "سجل الدخول أولًا.", "error");
    return;
  }

  if (!elements.receiptInput?.files?.length) {
    setMessage(elements.rechargeMessage, "أرفق صورة الإيصال أولًا.", "error");
    return;
  }

  setMessage(elements.rechargeMessage, "تم تجهيز الطلب. ابعت صورة الإيصال للأدمن على واتساب.", "success");
}

async function logoutUser() {\n  stopLessonMedia();\n  clearSessionUid();\n  state.currentUser = null;\n  await updateAuthUI();\n  setMessage(elements.authMessage, "تم تسجيل الخروج بنجاح.", "success");\n}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      document.querySelectorAll(".auth-form").forEach((form) => {
        form.classList.toggle("active", form.id === `${tab}Form`);
      });
      showScreen(tab === "register" ? "register" : "auth");
    });
  });
}

function bindEvents() {
  bindTabs();

  elements.openRegisterPageBtn?.addEventListener("click", () => showScreen("register"));
  elements.backFromRegisterBtn?.addEventListener("click", () => showScreen("auth"));
  elements.backFromRechargeBtn?.addEventListener("click", () => showScreen("dashboard"));
  elements.backFromPlayerBtn?.addEventListener("click", () => {
    stopLessonMedia();
    showScreen("dashboard");
  });
  elements.rechargeNavBtn?.addEventListener("click", () => showScreen("recharge"));
  elements.logoutBtn?.addEventListener("click", logoutUser);

  elements.loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    loginUser(new FormData(elements.loginForm));
  });

  elements.registerDetailsForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    registerUser(new FormData(elements.registerDetailsForm));
  });

  elements.teacherForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    addLesson(new FormData(elements.teacherForm));
  });

  elements.accessForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    unlockLesson(state.selectedLessonId, elements.lessonCodeInput?.value || "");
  });

  elements.rechargeForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitRecharge();
  });
}

async function init() {\n  try {\n    await ensureSeedData();\n    bindEvents();\n\n    const uid = getSessionUid();\n    if (uid) {\n      state.currentUser = await getUserById(uid);\n    }\n\n    await renderLessons();\n    await updateAuthUI();\n\n    if (!state.currentUser) {\n      setMessage(\n        elements.authMessage,\n        `استخدم admin / Admin@123456 أو سجل حساب جديد. Firebase شغال!`,\n        "info",\n      );\n    }\n  } catch (error) {\n    console.error('Init error:', error);\n    setMessage(elements.authMessage, "خطأ في التحميل - تحقق Firebase rules.", "error");\n  }\n}\n\ninit();\n
