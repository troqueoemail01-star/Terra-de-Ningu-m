/**
 * models/cable-factory.js
 * -------------------------------------------------
 * Utilitário genérico para desenhar um cabo/fio simples entre dois ou
 * mais pontos no espaço-mundo — criado para o cabo de energia entre a
 * tomada e a TV do quarto (ver scenes/room-scene.js e
 * models/outlet-factory.js), mas sem nada específico de TV/tomada
 * aqui: qualquer outra peça do jogo que precise de um fio entre dois
 * pontos (ex.: um futuro abajur com fio até a tomada) pode reaproveitar
 * este mesmo sistema, em vez de duplicar a lógica.
 *
 * Mesmo espírito "só geometria primitiva" do resto do jogo (nenhuma
 * curva/tubo do three.js usada em nenhum outro lugar do projeto — ver
 * SwitchFactory/LampFactory): cada trecho entre dois pontos vizinhos
 * vira um único THREE.CylinderGeometry fino, orientado para apontar de
 * um ponto ao outro; uma esfera pequena em cada ponto do meio (não nas
 * pontas) esconde a costura entre dois trechos consecutivos.
 *
 * `createCable` não sabe nada sobre para onde os pontos vêm — quem
 * chama já resolve as posições-mundo antes (normalmente com
 * `Object3D.getWorldPosition`, ver comentário em outlet-factory.js/
 * tv-factory.js) e monta o array `waypoints` (>= 2 pontos,
 * THREE.Vector3). O grupo devolvido já nasce pronto para entrar direto
 * na cena em coordenadas de mundo (`root.add(...)`, não filho de
 * nenhum dos dois objetos conectados) — assim não importa que a tomada
 * e a TV tenham cadeias de transformação diferentes (uma é filha da
 * parede, a outra é filha da mesinha).
 * -------------------------------------------------
 */

window.CableFactory = (function () {
  const DEFAULT_RADIUS = 0.004; // ~4mm — fio fino, mesmo porte do fio do abajur/telefone

  function buildSegment(a, b, radius, radialSegments, material) {
    const direction = new THREE.Vector3().subVectors(b, a);
    const length = direction.length();
    if (length < 1e-6) {
      return null;
    }
    const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    // O cilindro nasce com o eixo em +Y; gira para apontar de `a` até
    // `b` (mesma técnica de alinhar um objeto a uma direção com
    // quaternion, sem precisar calcular ângulos de Euler manualmente).
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );
    return mesh;
  }

  // `waypoints`: array de THREE.Vector3 (mundo), pelo menos 2 pontos —
  // o cabo passa por eles em ordem. `material` normalmente é um
  // material já existente reaproveitado (ver comentário de
  // OutletFactory sobre materials.phoneDial). `options.radius` é
  // opcional (padrão DEFAULT_RADIUS).
  function createCable(waypoints, material, options) {
    const radius = (options && options.radius) || DEFAULT_RADIUS;
    const radialSegments = (options && options.radialSegments) || 6;

    const group = new THREE.Group();

    for (let i = 0; i < waypoints.length - 1; i++) {
      const segment = buildSegment(waypoints[i], waypoints[i + 1], radius, radialSegments, material);
      if (segment) {
        group.add(segment);
      }
      // Esfera pequena nos pontos "do meio" (nem a ponta que encosta na
      // tomada, nem a ponta que encosta na TV) — só pra esconder a
      // costura entre dois cilindros consecutivos, sem aparecer como
      // uma "bolinha" solta nas duas pontas do fio.
      if (i > 0) {
        const joint = new THREE.Mesh(
          new THREE.SphereGeometry(radius, radialSegments, radialSegments),
          material
        );
        joint.position.copy(waypoints[i]);
        group.add(joint);
      }
    }

    return { group: group };
  }

  return { createCable: createCable };
})();
