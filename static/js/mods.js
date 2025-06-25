document.addEventListener("DOMContentLoaded", () => {
    fetchMods();
});

function fetchMods() {
    fetch("/mods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    })
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById("mods-container");
        container.innerHTML = "";

        if (!data.mods || data.mods.length === 0) {
            container.innerHTML = "<p>Нет доступных модов.</p>";
            return;
        }

        data.mods.forEach(mod => {
            const modBlock = document.createElement("div");
            modBlock.classList.add("mod-block");

            modBlock.setAttribute("data-mod-name", mod.name);

            const title = document.createElement("div");
            title.classList.add("mod-title");
            title.innerHTML = `<strong>${mod.label}</strong>`;
            modBlock.appendChild(title);

            mod.params.forEach(param => {
                const paramBlock = document.createElement("div");
                paramBlock.classList.add("mod-param");

                const label = document.createElement("label");
                label.innerText = param.label;

                if (param.type === "slider") {
                    const input = document.createElement("input");
                    input.type = "range";
                    input.min = param.min;
                    input.max = param.max;
                    input.value = param.default;
                    input.id = `mod-${mod.name}-${param.name}`;
                    input.classList.add("settings-range");

                    const valueDisplay = document.createElement("span");
                    valueDisplay.innerText = `${param.default}`;
                    valueDisplay.style.marginLeft = "10px";

                    input.addEventListener("input", () => {
                        valueDisplay.innerText = input.value;
                    });

                    paramBlock.appendChild(label);
                    paramBlock.appendChild(input);
                    paramBlock.appendChild(valueDisplay);

                } else if (param.type === "text") {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = param.default;
                    input.id = `mod-${mod.name}-${param.name}`;
                    input.classList.add("settings-input");

                    paramBlock.appendChild(label);
                    paramBlock.appendChild(input);

                } else if (param.type === "file") {
                    const fileContainer = document.createElement("div");
                    fileContainer.classList.add("mod-file-upload");
                    
                    const fileBtn = document.createElement("button");
                    fileBtn.classList.add("mod-file-btn");
                    fileBtn.innerHTML = `<i class="fas fa-upload"></i> Выбрать файл`;
                    
                    const fileInput = document.createElement("input");
                    fileInput.type = "file";
                    fileInput.accept = param.accept || "*/*";
                    fileInput.classList.add("mod-file-input");
                    fileInput.id = `mod-${mod.name}-${param.name}`;
                    
                    const fileInfo = document.createElement("div");
                    fileInfo.classList.add("mod-file-info");
                    fileInfo.innerHTML = `<i class="fas fa-info-circle"></i> Файл не выбран`;
                    
                    const fileName = document.createElement("span");
                    fileName.classList.add("mod-file-name");
                    
                    fileBtn.addEventListener("click", () => fileInput.click());
                    
                    fileInput.addEventListener("change", () => {
                        if (fileInput.files.length > 0) {
                            const file = fileInput.files[0];
                            fileName.textContent = file.name;
                            fileInfo.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Загрузка...`;

                            handleFileUpload({ target: { files: [file] } }, 'mod-file', (path, error) => {
                                if (path) {
                                    fileInfo.innerHTML = `<i class="fas fa-check-circle mod-file-icon"></i> Файл загружен`;
                                    fileInput.setAttribute('data-upload-path', path);
                                } else {
                                    fileInfo.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Ошибка загрузки`;
                                    fileInput.removeAttribute('data-upload-path');
                                    fileName.textContent = "";
                                }
                            });
                        } else {
                            fileInfo.innerHTML = `<i class="fas fa-info-circle"></i> Файл не выбран`;
                            fileName.textContent = "";
                            fileInput.removeAttribute('data-upload-path');
                        }
                    });
                    
                    fileContainer.appendChild(fileBtn);
                    fileContainer.appendChild(fileInfo);
                    fileContainer.appendChild(fileName);
                    
                    paramBlock.appendChild(label);
                    paramBlock.appendChild(fileContainer);
                    paramBlock.appendChild(fileInput);
                }

                modBlock.appendChild(paramBlock);
            });

            container.appendChild(modBlock);
        });
    })
    .catch(err => {
        document.getElementById("mods-container").innerHTML = "<p>Ошибка загрузки модов</p>";
        console.error("Ошибка получения модов:", err);
    });
}

function collectMods() {
    const modBlocks = document.querySelectorAll("#mods-container .mod-block");
    const mods = [];

    modBlocks.forEach(block => {
        const modName = block.getAttribute("data-mod-name");

        const params = {};
        block.querySelectorAll("input").forEach(input => {
            const paramName = input.id.replace(`mod-${modName}-`, "");

            let value;
            if (input.type === "file") {
                value = input.getAttribute('data-upload-path') || "";
            } else {
                value = input.value;

                if (!isNaN(value) && value.trim() !== "") {
                    value = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
                }
            }

            params[paramName] = value;
        });

        mods.push({
            name: modName,
            params: params
        });
    });

    return mods;
}