import * as mc from "@minecraft/server"
import * as ui from "@minecraft/server-ui"
function main(){
    const players = mc.world.getAllPlayers()
    for(let i in players){
        if(players[i].hasTag('structure')){
            const this_player = players[i]
            this_player.removeTag('structure')
            show_structure_panel(this_player)
        }
    }
}
function show_structure_panel(player){
    if(!player.getDynamicProperty('structure_sort')){
        player.setDynamicProperty('structure_sort', 0)
    }
    let structures = mc.world.structureManager.getWorldStructureIds()
    const choice = player.getDynamicProperty('structure_sort')
    const sort_string = ["按字母排序", "按时间排序", "按结构体积排序"][choice % 10] + ['§r§8 - §a正序', '§r§8 - §a倒序'][Math.round(choice / 10 - 0.5)] // xy  x: 正逆序 y: 排序种类
    let structure_panel = new ui.ActionFormData().title('§r§8结构管理器 - 主页').body(`§a您可以在此界面配置管理器\n  §8* §7给予玩家 structure 标签即可打开此界面\n  §8* §7例 /tag @s add structure\n§g在当前世界检测到 §e${structures.length} §g个结构`)
    .button('§r§8查看结构')
    .button(`§r§8调整结构排序\n§5${sort_string}`)
    structure_panel.show(player).then((sel)=>{
        if(!(sel.cancelationReason == "UserClosed")){
            if(sel.selection == 0){
                function show_structures(player){
                    structures = mc.world.structureManager.getWorldStructureIds()
                    let structure_list = new ui.ActionFormData().title('§r§8结构管理器 - 结构列表').body(`§a您可以在此界面选择需要进行操作的结构\n§g已加载 §e${structures.length} §g个结构`)

                    switch(choice % 10){
                        case 0:{
                            structures.sort()
                            if(Math.round(choice / 10 - 0.5) == 1){
                                structures.reverse()
                            }
                            break
                        } // 字母
                        case 1:{
                            if(Math.round(choice / 10 - 0.5) == 0){
                                structures.reverse()
                            }
                            break
                        } // 创建时间
                        case 2:{
                            let structure_sizes = []
                            for(let i in structures){
                                const size = mc.world.structureManager.get(structures[i]).size
                                structure_sizes.push([size.x * size.y * size.z, structures[i]])
                            }
                            structure_sizes = structure_sizes.sort((a, b) => {
                                if (a[0] < b[0]) return (Math.round(choice / 10 - 0.5) == 1 ? 1 : -1);
                                if (a[0] > b[0]) return (Math.round(choice / 10 - 0.5) == 1 ? -1 : 1);
                            
                                if (a[1] < b[1]) return -1;
                                if (a[1] > b[1]) return 1;
                                })
                            structures = []
                            for(let i in structure_sizes){
                                structures.push(structure_sizes[i][1])
                            }
                            break
                        } // 体积
                    }

                    for(let i in structures){
                        let this_structure = mc.world.structureManager.get(structures[i])
                        let field = structures[i].split(':')[0]
                        let name = structures[i].slice(field.length + 1)
                        let size = this_structure.size
                        structure_list.button(`§r§8${name} §8| §u[ ${size.x}x${size.y}x${size.z} ]\n§5域 §d${field}§8 | §5体积 §d${size.x * size.y * size.z}`)
                    }
                    structure_list.button('§r§8返回')
                    if(structures.length == 0){
                        structure_list.body(`§a您可以在此界面选择需要进行操作的结构\n§4未检测到任何可用的结构 §c请尝试创建或导入新结构`)
                    }
                    structure_list.show(player).then((sel_1)=>{
                        if(!(sel_1.cancelationReason == "UserClosed")){
                            let sel_1_selection = sel_1.selection
                            if(structures.length == sel_1_selection){
                                show_structure_panel(player)
                            }else{
                                function show_settings_panel(player){
                                    let this_structure = mc.world.structureManager.get(structures[sel_1_selection])
                                    let field = this_structure.id.split(':')[0]
                                    let name = this_structure.id.slice(field.length + 1)
                                    let id = this_structure.id
                                    let size = this_structure.size
                                    let settings = new ui.ActionFormData().title(`§r§8结构管理器 - 结构管理 - ${name}`).body(`§r§a您正在查看结构 §s${name} §a的信息\n  §p* §gID §e${id}\n  §p* §g大小 §e${size.x}x${size.y}x${size.z}\n  §p* §g体积 §e${size.x*size.y*size.z}`).button('§r§t重命名').button('§r§m删除 (永久性的)').button('§r§8返回')
                                    settings.show(player).then((sel)=>{
                                        if(!(sel.cancelationReason == "UserClosed")){
                                            if(sel.selection == 0){
                                                let rename_structure_panel = new ui.ModalFormData().title(`§r§8结构管理器 - 结构重命名 - ${name}`).textField(`§r§a请输入你想给结构 §s${name} §a起的新名字\n§a新的结构将继承旧结构的域名 §s${field}`, '§7请输入新名字.. (无须加域名)')
                                                rename_structure_panel.show(player).then((sel)=>{
                                                    if(!(sel.cancelationReason == "UserClosed")){
                                                        const newName = sel.formValues[0]
                                                        let no_conflict = true
                                                        let permitted = false

                                                        function rename_end(){
                                                            let rename_structure = new ui.ActionFormData().title(`§r§8结构管理器 - 结构重命名 - ${name} - 结束`).body(`§r§a您已成功将结构 §s${name} §a重新命名为 §s${newName}`)
                                                            if(structures.indexOf(`${field}:${newName}`) >= 0 && !permitted){
                                                                no_conflict = false
                                                                rename_structure.title(`§r§8结构管理器 - 结构重命名 - ${name} - 冲突处理`).body(`§r§m已经存在名为 §c${newName} §4的结构\n§4继续进行重命名将覆盖掉原有结构 §n三思而后行!`).button(`§c覆盖`).button(`§a取消`)
                                                            }else if(!permitted){
                                                                rename_structure.button('§8返回')
                                                                structures[sel_1_selection] = field + ':' + newName
                                                                this_structure.saveAs(`${field}:${newName}`)
                                                                mc.world.structureManager.delete(this_structure)
                                                            }
                                                            if(structures.indexOf(`${field}:${newName}`) >= 0 && permitted){
                                                                rename_structure.button('§8返回')
                                                            }
                                                            rename_structure.show(player).then((sel)=>{
                                                                if(!(sel.cancelationReason == "UserClosed")){
                                                                    if(sel.selection == 0){
                                                                        if(no_conflict || permitted){
                                                                            show_settings_panel(player)
                                                                        }else{
                                                                            permitted = true
                                                                            if(structures.indexOf(`${field}:${newName}`) < sel_1_selection){
                                                                                sel_1_selection -= 1
                                                                            }
                                                                            mc.world.structureManager.delete(`${field}:${newName}`)
                                                                            structures.splice(structures.indexOf(`${field}:${newName}`), 1)
                                                                            structures[sel_1_selection] = field + ':' + newName
                                                                            mc.system.runTimeout(()=>{
                                                                                this_structure.saveAs(`${field}:${newName}`)
                                                                                mc.world.structureManager.delete(this_structure)
                                                                                rename_end(player)
                                                                            }, 1)
                                                                        }
                                                                    }else{
                                                                        show_settings_panel(player)
                                                                    }
                                                                }
                                                            })
                                                        }
                                                        rename_end(player)
                                                        
                                                    }
                                                })
                                            }else if(sel.selection == 1){
                                                let success = true
                                                let delete_structure_panel = new ui.ActionFormData().title(`§r§8结构管理器 - 结构删除 - ${name} - 结束`).body(`§r§a您已成功删除结构 §s${name}`).button('§r§8返回')
                                                if(!mc.world.structureManager.delete(this_structure)){
                                                    delete_structure_panel.body(`§r§4在删除结构 §c${name} §4时发生了未知错误`)
                                                    success = false
                                                }
                                                delete_structure_panel.show(player).then((sel)=>{
                                                    if(!(sel.cancelationReason == "UserClosed")){
                                                        if(success){
                                                            show_structures(player)
                                                        }else{
                                                            show_settings_panel(player)
                                                        }
                                                    }
                                                })
                                            }else if(sel.selection == 2){
                                                show_structures(player)
                                            }
                                        }
                                    })
                                }
                                show_settings_panel(player)
                            }
                        }
                    })
                }
                show_structures(player)
            }else{
                let sort_panel = new ui.ModalFormData().title(`§r§8结构管理器 - 排序配置`).dropdown(`§r§a请选择您想要的结构排列类型`, ['按字母排序', '按时间排序', '按结构体积排序'], choice % 10).dropdown(`§r§a请选择您想要的结构排列顺序`, ['正序', '倒序'], Math.round(choice / 10 - 0.5))
                sort_panel.show(player).then((sel)=>{
                    if(!(sel.cancelationReason == "UserClosed")){
                        player.setDynamicProperty('structure_sort', sel.formValues[0] + sel.formValues[1] * 10)
                        show_structure_panel(player)
                    }
                })
            }
        }
    })
}
mc.system.runInterval(main, 1)
mc.system.runTimeout(()=>{mc.world.sendMessage('§q您已成功装载 §a结构管理器 §qAddOn\n  §p* §g作者 §eAmmonia_\n  §p* §g版本 §ev1.0.0\n  §p* §g简介 §e帮助玩家在游戏内快捷管理保存的结构\n  §p* §g使用说明 §e输入 /tag @s add structure 进入主界面')}, 60)