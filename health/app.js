// Global state
let userData = {
    weight: 0,
    height: 0,
    age: 0,
    gender: 'male',
    activity: 1.2,
    goal: 'maintain',
    bmi: 0,
    protein: 0,
    carbs: 0,
    calories: 0
};

let mealData = {
    breakfast: {},
    lunch: {},
    dinner: {}
};

let currentMeal = 'breakfast';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initializeTheme();
    
    // Load cached data
    loadCachedData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize meal tabs
    initializeMealTabs();
    
    // Initialize food counters
    initializeFoodCounters();
});

// Initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Update theme icon
function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Load cached data from localStorage
function loadCachedData() {
    const cached = localStorage.getItem('healthCalculatorData');
    if (cached) {
        const data = JSON.parse(cached);
        userData = data.userData;
        mealData = data.mealData || { breakfast: {}, lunch: {}, dinner: {} };
        
        // Fill form with cached data
        document.getElementById('weight').value = userData.weight;
        document.getElementById('height').value = userData.height;
        document.getElementById('age').value = userData.age;
        document.getElementById('gender').value = userData.gender;
        document.getElementById('activity').value = userData.activity;
        document.getElementById('goal').value = userData.goal || 'maintain';
        
        // Auto-calculate if we have valid data
        if (userData.weight && userData.height && userData.age) {
            calculateAll(false); // false = don't scroll
            
            // Collapse calculator section
            const calcSection = document.querySelector('.calculator-section');
            calcSection.classList.add('collapsed');
            
            // Add cached info display
            const cachedInfo = document.createElement('div');
            cachedInfo.className = 'cached-info';
            cachedInfo.innerHTML = `
                <span class="cached-item">الوزن: ${userData.weight} كجم</span>
                <span class="cached-item">الطول: ${userData.height} سم</span>
                <span class="cached-item">العمر: ${userData.age}</span>
                <span class="cached-item">BMI: ${userData.bmi.toFixed(1)}</span>
            `;
            calcSection.appendChild(cachedInfo);
            
            // Make calculator expandable
            calcSection.addEventListener('click', function() {
                if (this.classList.contains('collapsed')) {
                    this.classList.remove('collapsed');
                    if (cachedInfo) cachedInfo.remove();
                }
            });
            
            // Restore meal selections
            restoreMealSelections();
        }
    }
}

// Save data to localStorage
function saveToCache() {
    const dataToSave = {
        userData: userData,
        mealData: mealData,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('healthCalculatorData', JSON.stringify(dataToSave));
}

// Restore meal selections from cache
function restoreMealSelections() {
    const meals = ['breakfast', 'lunch', 'dinner'];
    
    meals.forEach(mealName => {
        const mealContent = document.getElementById(mealName);
        const foodItems = mealContent.querySelectorAll('.food-item');
        
        foodItems.forEach(item => {
            const foodName = item.dataset.food;
            const counterValue = item.querySelector('.counter-value');
            
            if (mealData[mealName][foodName] && mealData[mealName][foodName].count > 0) {
                counterValue.textContent = mealData[mealName][foodName].count;
                item.classList.add('selected');
            }
        });
    });
    
    updateMealSummary();
    updateDailySummary();
}

// Setup all event listeners
function setupEventListeners() {
    // Calculate button
    document.getElementById('calculateBtn').addEventListener('click', () => calculateAll(true));
    
    // Theme toggle button
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Save buttons
    document.getElementById('saveAllMealsBtn').addEventListener('click', saveAllMealsAsImage);
    
    // Clear cache button
    document.getElementById('clearCacheBtn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من مسح كل البيانات المحفوظة؟')) {
            localStorage.removeItem('healthCalculatorData');
            location.reload();
        }
    });
    
    // Input animations
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', (e) => {
            e.target.parentElement.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', (e) => {
            e.target.parentElement.style.transform = 'scale(1)';
        });
    });
}

// Calculate BMI and nutritional needs
function calculateAll(shouldScroll = true) {
    // Get input values
    userData.weight = parseFloat(document.getElementById('weight').value) || 0;
    userData.height = parseFloat(document.getElementById('height').value) || 0;
    userData.age = parseFloat(document.getElementById('age').value) || 0;
    userData.gender = document.getElementById('gender').value;
    userData.activity = parseFloat(document.getElementById('activity').value);
    userData.goal = document.getElementById('goal').value;
    
    // Validate inputs
    if (!userData.weight || !userData.height || !userData.age) {
        showNotification('من فضلك اكمل كل البيانات', 'error');
        return;
    }
    
    // Calculate BMI
    const heightInMeters = userData.height / 100;
    userData.bmi = userData.weight / (heightInMeters * heightInMeters);
    
    // Calculate BMR (Basal Metabolic Rate)
    let bmr;
    if (userData.gender === 'male') {
        bmr = 88.362 + (13.397 * userData.weight) + (4.799 * userData.height) - (5.677 * userData.age);
    } else {
        bmr = 447.593 + (9.247 * userData.weight) + (3.098 * userData.height) - (4.330 * userData.age);
    }
    
    // Calculate TDEE (Total Daily Energy Expenditure)
    let tdee = bmr * userData.activity;
    
    // Adjust calories based on goal
    if (userData.goal === 'gain') {
        // Add 300-500 calories for muscle gain
        userData.calories = Math.round(tdee + 400);
    } else if (userData.goal === 'lose') {
        // Subtract 300-500 calories for weight loss
        userData.calories = Math.round(tdee - 400);
    } else {
        userData.calories = Math.round(tdee);
    }
    
    // Calculate protein needs based on goal
    let proteinMultiplier;
    if (userData.goal === 'gain') {
        // Higher protein for muscle building (2.0-2.5g per kg)
        proteinMultiplier = 2.2;
    } else if (userData.goal === 'lose') {
        // Moderate-high protein to preserve muscle (1.8-2.2g per kg)
        proteinMultiplier = 2.0;
    } else {
        // Maintenance protein (1.6-2.0g per kg)
        proteinMultiplier = 1.8;
    }
    userData.protein = Math.round(userData.weight * proteinMultiplier);
    
    // Calculate carbs based on goal
    let carbsPercentage;
    if (userData.goal === 'gain') {
        // Higher carbs for energy and muscle building (55-60% of calories)
        carbsPercentage = 0.55;
    } else if (userData.goal === 'lose') {
        // Lower carbs for fat loss (35-40% of calories)
        carbsPercentage = 0.35;
    } else {
        // Balanced carbs (45-50% of calories)
        carbsPercentage = 0.45;
    }
    const carbsCalories = userData.calories * carbsPercentage;
    userData.carbs = Math.round(carbsCalories / 4); // 4 calories per gram of carbs
    
    // Save to cache
    saveToCache();
    
    // Display results with animation
    displayResults();
    
    // Show meals section
    document.getElementById('mealsSection').classList.remove('hidden');
    document.getElementById('dailySummary').classList.remove('hidden');
    
    // Update daily targets
    updateDailyTargets();
    
    // Smooth scroll to results if requested
    if (shouldScroll) {
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    }
}

// Display calculation results
function displayResults() {
    const resultsSection = document.getElementById('results');
    resultsSection.classList.remove('hidden');
    
    // BMI
    const bmiValue = userData.bmi.toFixed(1);
    document.getElementById('bmiValue').textContent = bmiValue;
    
    // BMI Status
    let status, statusColor, indicatorPosition;
    if (userData.bmi < 18.5) {
        status = 'نحيف';
        statusColor = '#3b82f6';
        indicatorPosition = '10%';
    } else if (userData.bmi < 25) {
        status = 'وزن مثالي';
        statusColor = '#10b981';
        indicatorPosition = '37%';
    } else if (userData.bmi < 30) {
        status = 'زيادة في الوزن';
        statusColor = '#f59e0b';
        indicatorPosition = '62%';
    } else {
        status = 'سمنة';
        statusColor = '#ef4444';
        indicatorPosition = '87%';
    }
    
    const bmiStatus = document.getElementById('bmiStatus');
    bmiStatus.textContent = status;
    bmiStatus.style.backgroundColor = statusColor;
    bmiStatus.style.color = 'white';
    bmiStatus.style.padding = '5px 15px';
    bmiStatus.style.borderRadius = '20px';
    
    // Set BMI indicator position
    document.getElementById('bmiIndicator').style.setProperty('--indicator-position', indicatorPosition);
    
    // Protein
    let proteinMin, proteinMax;
    if (userData.goal === 'gain') {
        proteinMin = Math.round(userData.weight * 2.0);
        proteinMax = Math.round(userData.weight * 2.5);
    } else if (userData.goal === 'lose') {
        proteinMin = Math.round(userData.weight * 1.8);
        proteinMax = Math.round(userData.weight * 2.2);
    } else {
        proteinMin = Math.round(userData.weight * 1.6);
        proteinMax = Math.round(userData.weight * 2.0);
    }
    document.getElementById('proteinValue').textContent = userData.protein;
    document.getElementById('proteinRange').textContent = `${proteinMin} - ${proteinMax} جرام`;
    
    // Carbs
    const carbsMin = Math.round(userData.carbs * 0.9);
    const carbsMax = Math.round(userData.carbs * 1.1);
    document.getElementById('carbsValue').textContent = userData.carbs;
    document.getElementById('carbsRange').textContent = `${carbsMin} - ${carbsMax} جرام`;
    
    // Calories
    document.getElementById('caloriesValue').textContent = userData.calories;
    
    // Animate values
    animateValues();
}

// Animate number counting
function animateValues() {
    const elements = document.querySelectorAll('.result-value');
    elements.forEach(el => {
        const finalValue = parseFloat(el.textContent);
        if (!isNaN(finalValue)) {
            let currentValue = 0;
            const increment = finalValue / 30;
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= finalValue) {
                    currentValue = finalValue;
                    clearInterval(timer);
                }
                el.textContent = currentValue.toFixed(el.id === 'bmiValue' ? 1 : 0);
            }, 30);
        }
    });
}

// Initialize meal tabs
function initializeMealTabs() {
    const tabs = document.querySelectorAll('.meal-tab');
    const contents = document.querySelectorAll('.meal-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked
            tab.classList.add('active');
            currentMeal = tab.dataset.meal;
            document.getElementById(currentMeal).classList.add('active');
            
            // Update meal summary
            updateMealSummary();
        });
    });
}

// Initialize food counters
function initializeFoodCounters() {
    const foodItems = document.querySelectorAll('.food-item');
    
    foodItems.forEach(item => {
        const minusBtn = item.querySelector('.counter-btn.minus');
        const plusBtn = item.querySelector('.counter-btn.plus');
        const counterValue = item.querySelector('.counter-value');
        const foodName = item.dataset.food;
        const protein = parseInt(item.dataset.protein);
        const carbs = parseInt(item.dataset.carbs);
        
        // Initialize meal data
        if (!mealData[currentMeal][foodName]) {
            mealData[currentMeal][foodName] = {
                count: 0,
                protein: protein,
                carbs: carbs,
                name: item.querySelector('.food-name').textContent
            };
        }
        
        // Make the entire food item clickable to add
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking on minus button
            if (e.target.classList.contains('minus')) return;
            
            const meal = item.closest('.meal-content').id;
            if (!mealData[meal][foodName]) {
                mealData[meal][foodName] = {
                    count: 0,
                    protein: protein,
                    carbs: carbs,
                    name: item.querySelector('.food-name').textContent
                };
            }
            mealData[meal][foodName].count++;
            counterValue.textContent = mealData[meal][foodName].count;
            item.classList.add('selected');
            updateMealSummary();
            updateDailySummary();
            saveToCache(); // Save after each change
            
            // Add animation
            counterValue.style.transform = 'scale(1.2)';
            item.style.transform = 'scale(1.05)';
            setTimeout(() => {
                counterValue.style.transform = 'scale(1)';
                item.style.transform = 'scale(1)';
            }, 200);
        });
        
        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const meal = item.closest('.meal-content').id;
            if (mealData[meal][foodName] && mealData[meal][foodName].count > 0) {
                mealData[meal][foodName].count--;
                counterValue.textContent = mealData[meal][foodName].count;
                if (mealData[meal][foodName].count === 0) {
                    item.classList.remove('selected');
                }
                updateMealSummary();
                updateDailySummary();
                saveToCache(); // Save after each change
                
                // Add animation
                counterValue.style.transform = 'scale(0.8)';
                minusBtn.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    counterValue.style.transform = 'scale(1)';
                    minusBtn.style.transform = 'scale(1)';
                }, 200);
            }
        });
    });
}

// Update meal summary
function updateMealSummary() {
    let totalProtein = 0;
    let totalCarbs = 0;
    let selectedItemsHTML = '';
    
    const meal = mealData[currentMeal];
    for (const food in meal) {
        if (meal[food].count > 0) {
            totalProtein += meal[food].protein * meal[food].count;
            totalCarbs += meal[food].carbs * meal[food].count;
            selectedItemsHTML += `
                <div class="selected-item">
                    <span>${meal[food].name}</span>
                    <span>(${meal[food].count})</span>
                </div>
            `;
        }
    }
    
    document.getElementById('mealProtein').textContent = totalProtein;
    document.getElementById('mealCarbs').textContent = totalCarbs;
    document.getElementById('selectedItems').innerHTML = selectedItemsHTML;
}

// Update daily targets
function updateDailyTargets() {
    document.getElementById('targetProtein').textContent = userData.protein;
    document.getElementById('targetCarbs').textContent = userData.carbs;
    updateDailySummary();
}

// Update daily summary
function updateDailySummary() {
    let totalProtein = 0;
    let totalCarbs = 0;
    
    // Calculate totals from all meals
    for (const mealName in mealData) {
        const meal = mealData[mealName];
        for (const food in meal) {
            if (meal[food].count > 0) {
                totalProtein += meal[food].protein * meal[food].count;
                totalCarbs += meal[food].carbs * meal[food].count;
            }
        }
    }
    
    // Update display
    document.getElementById('totalProtein').textContent = totalProtein;
    document.getElementById('totalCarbs').textContent = totalCarbs;
    
    // Update progress bars
    const proteinPercentage = Math.min((totalProtein / userData.protein) * 100, 100);
    const carbsPercentage = Math.min((totalCarbs / userData.carbs) * 100, 100);
    
    document.getElementById('proteinFill').style.width = proteinPercentage + '%';
    document.getElementById('carbsFill').style.width = carbsPercentage + '%';
}

// Save meal as image
async function saveMealAsImage(mealName) {
    // Create a temporary div for the meal plan
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 800px;
        padding: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: 'Cairo', sans-serif;
        direction: rtl;
        z-index: 10000;
    `;
    
    const mealTitle = mealName === 'breakfast' ? 'الفطار' : 
                      mealName === 'lunch' ? 'الغداء' : 'العشاء';
    
    let mealContent = `
        <div style="background: rgba(255,255,255,0.95); border-radius: 20px; padding: 30px;">
            <h1 style="text-align: center; color: #6366f1; margin-bottom: 30px; font-size: 2rem;">
                خطة ${mealTitle}
            </h1>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px;">معلوماتك الشخصية:</h3>
                <p style="color: #666;">الوزن: ${userData.weight} كجم | الطول: ${userData.height} سم</p>
                <p style="color: #666;">BMI: ${userData.bmi.toFixed(1)} | السعرات اليومية: ${userData.calories}</p>
                <p style="color: #666;">الهدف: ${userData.goal === 'gain' ? 'زيادة الوزن' : userData.goal === 'lose' ? 'خسارة الوزن' : 'الحفاظ على الوزن'}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px;">الأطعمة المختارة:</h3>
    `;
    
    let totalProtein = 0;
    let totalCarbs = 0;
    
    const meal = mealData[mealName];
    for (const food in meal) {
        if (meal[food].count > 0) {
            totalProtein += meal[food].protein * meal[food].count;
            totalCarbs += meal[food].carbs * meal[food].count;
            mealContent += `
                <div style="background: #f3f4f6; padding: 10px; margin: 10px 0; border-radius: 10px;">
                    <strong>${meal[food].name}</strong> × ${meal[food].count}
                    <span style="color: #666; margin-right: 20px;">
                        (بروتين: ${meal[food].protein * meal[food].count}جم | كارب: ${meal[food].carbs * meal[food].count}جم)
                    </span>
                </div>
            `;
        }
    }
    
    mealContent += `
            </div>
            <div style="background: #6366f1; color: white; padding: 15px; border-radius: 10px; text-align: center;">
                <h3>المجموع</h3>
                <p>البروتين: ${totalProtein} جرام | الكربوهيدرات: ${totalCarbs} جرام</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 0.9rem;">
                تم الإنشاء بواسطة حاسبة الصحة والتغذية
            </div>
        </div>
    `;
    
    tempDiv.innerHTML = mealContent;
    document.body.appendChild(tempDiv);
    
    // Use html2canvas to capture the element
    try {
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            backgroundColor: null,
            logging: false
        });
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `خطة_${mealTitle}_${new Date().toLocaleDateString('ar-EG')}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        showNotification(`تم حفظ خطة ${mealTitle} بنجاح! 🎉`, 'success');
    } catch (error) {
        console.error('Error saving image:', error);
        showNotification('حدث خطأ في حفظ الصورة', 'error');
    } finally {
        document.body.removeChild(tempDiv);
    }
}

// Save all meals as image
async function saveAllMealsAsImage() {
    // Create a temporary div for all meals
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 900px;
        padding: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: 'Cairo', sans-serif;
        direction: rtl;
        z-index: 10000;
    `;
    
    let allMealsContent = `
        <div style="background: rgba(255,255,255,0.95); border-radius: 20px; padding: 30px;">
            <h1 style="text-align: center; color: #6366f1; margin-bottom: 30px; font-size: 2.5rem;">
                خطة التغذية اليومية الكاملة
            </h1>
            <div style="background: #f9fafb; padding: 20px; border-radius: 15px; margin-bottom: 30px;">
                <h3 style="color: #333; margin-bottom: 15px;">معلوماتك الشخصية:</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <p style="color: #666;">الوزن: ${userData.weight} كجم</p>
                    <p style="color: #666;">الطول: ${userData.height} سم</p>
                    <p style="color: #666;">BMI: ${userData.bmi.toFixed(1)}</p>
                    <p style="color: #666;">السعرات اليومية: ${userData.calories}</p>
                    <p style="color: #666;">البروتين المطلوب: ${userData.protein} جم</p>
                    <p style="color: #666;">الكربوهيدرات المطلوبة: ${userData.carbs} جم</p>
                    <p style="color: #666;">الهدف: ${userData.goal === 'gain' ? 'زيادة الوزن وبناء العضلات' : userData.goal === 'lose' ? 'خسارة الوزن' : 'الحفاظ على الوزن'}</p>
                </div>
            </div>
    `;
    
    const meals = ['breakfast', 'lunch', 'dinner'];
    const mealNames = {
        breakfast: 'الفطار 🌅',
        lunch: 'الغداء ☀️',
        dinner: 'العشاء 🌙'
    };
    
    let dailyTotalProtein = 0;
    let dailyTotalCarbs = 0;
    
    for (const mealName of meals) {
        let mealProtein = 0;
        let mealCarbs = 0;
        let mealItems = '';
        
        const meal = mealData[mealName];
        for (const food in meal) {
            if (meal[food].count > 0) {
                mealProtein += meal[food].protein * meal[food].count;
                mealCarbs += meal[food].carbs * meal[food].count;
                mealItems += `
                    <div style="background: white; padding: 8px; margin: 5px 0; border-radius: 8px; display: flex; justify-content: space-between;">
                        <span><strong>${meal[food].name}</strong> × ${meal[food].count}</span>
                        <span style="color: #666; font-size: 0.9rem;">
                            بروتين: ${meal[food].protein * meal[food].count}جم | كارب: ${meal[food].carbs * meal[food].count}جم
                        </span>
                    </div>
                `;
            }
        }
        
        dailyTotalProtein += mealProtein;
        dailyTotalCarbs += mealCarbs;
        
        if (mealItems) {
            allMealsContent += `
                <div style="margin-bottom: 25px;">
                    <h2 style="color: #6366f1; margin-bottom: 15px; font-size: 1.5rem;">
                        ${mealNames[mealName]}
                    </h2>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                        ${mealItems}
                        <div style="background: #6366f1; color: white; padding: 10px; border-radius: 8px; margin-top: 10px; text-align: center;">
                            مجموع الوجبة: بروتين ${mealProtein}جم | كربوهيدرات ${mealCarbs}جم
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // Add daily total
    allMealsContent += `
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 15px; margin-top: 30px;">
                <h3 style="text-align: center; margin-bottom: 15px; font-size: 1.5rem;">المجموع اليومي</h3>
                <div style="display: flex; justify-content: space-around; text-align: center;">
                    <div>
                        <p style="font-size: 2rem; font-weight: bold;">${dailyTotalProtein}</p>
                        <p>جرام بروتين</p>
                        <p style="opacity: 0.8; font-size: 0.9rem;">من ${userData.protein} جم</p>
                    </div>
                    <div>
                        <p style="font-size: 2rem; font-weight: bold;">${dailyTotalCarbs}</p>
                        <p>جرام كربوهيدرات</p>
                        <p style="opacity: 0.8; font-size: 0.9rem;">من ${userData.carbs} جم</p>
                    </div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 0.9rem;">
                تم الإنشاء بتاريخ ${new Date().toLocaleDateString('ar-EG')} | حاسبة الصحة والتغذية
            </div>
        </div>
    `;
    
    tempDiv.innerHTML = allMealsContent;
    document.body.appendChild(tempDiv);
    
    // Use html2canvas to capture the element
    try {
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            backgroundColor: null,
            logging: false
        });
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `خطة_التغذية_الكاملة_${new Date().toLocaleDateString('ar-EG')}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        showNotification('تم حفظ خطة التغذية الكاملة بنجاح! 🎉', 'success');
    } catch (error) {
        console.error('Error saving image:', error);
        showNotification('حدث خطأ في حفظ الصورة', 'error');
    } finally {
        document.body.removeChild(tempDiv);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 30px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideDown 0.5s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -100%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -100%);
        }
    }
`;
document.head.appendChild(style);
